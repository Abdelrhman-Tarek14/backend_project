import React, { useState, useEffect, useMemo } from 'react';
import { BiWifiOff } from 'react-icons/bi';
import { casesApi } from '../../../api/casesApi';

import {
    DndContext,
    closestCenter,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';

import type {
    DragStartEvent,
    DragEndEvent
} from '@dnd-kit/core';

import {
    SortableContext,
    rectSortingStrategy,
    arrayMove
} from '@dnd-kit/sortable';

import { timerService } from '../../../features/timer/services/timerService';
import type { FormattedCase } from '../../../features/timer/services/timerService';
import { CaseCard } from './CaseCard';
// حذفنا استيراد CaseData عشان هنعتمد على FormattedCase مباشرة لتوحيد الأنواع
import { CaseGroup } from './CaseGroup';
import { AdminSearchInput } from './AdminSearchInput';
import { SortableItem } from './SortableItem';
import styles from './OpenCases.module.css';
import { formatAgentName } from '../../../utils/formatters';
import { SiSalesforce } from "react-icons/si";
import socketService from '../../../services/socket';

interface SystemStatus {
    system: string;
    status: string;
    [key: string]: any;
}

// ✅ تعريف واحد وحيد وشامل للـ OpenCase
// بيمتد من FormattedCase عشان يضمن وجود الـ assignmentId (string | number) والـ eta
interface OpenCase extends FormattedCase {
    id?: string | number;
    queueRecord?: { position: number };
}

const OpenCasesPage: React.FC = () => {
    const [cases, setCases] = useState<OpenCase[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeId, setActiveId] = useState<string | number | null>(null);
    const [filterTab, setFilterTab] = useState<string>('all');
    const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
    const [tick, setTick] = useState<number>(0);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await casesApi.getSalesforceSyncStatus();
                // ✅ فك الـ status القديمة عشان نمنع خطأ "specified more than once"
                const { status: apiStatus, ...rest } = response.data;

                const sfData: SystemStatus = {
                    system: 'salesforce',
                    status: apiStatus === 'online' ? 'OK' : 'Offline',
                    ...rest
                };

                setSystemStatus([sfData]);
            } catch (err) {
                console.error("Failed to fetch system status:", err);
                setSystemStatus([]);
            }
        };

        fetchStatus();

        const handleHeartbeat = (status: SystemStatus) => {
            setSystemStatus(prevStatus => {
                const existing = prevStatus.findIndex(s => s.system === status.system);
                if (existing !== -1) {
                    const newList = [...prevStatus];
                    newList[existing] = status;
                    return newList;
                }
                return [...prevStatus, status];
            });
        };

        socketService.on('sf_heartbeat', handleHeartbeat);
        return () => { socketService.off('sf_heartbeat', handleHeartbeat); };
    }, []);

    const isSalesforceConnected = useMemo(() => {
        const sf = systemStatus.find(s => s.system === 'salesforce');
        return sf?.status === 'OK';
    }, [systemStatus]);

    // ✅ تحويل الـ ID دايماً لـ string عشان مكتبة الـ DndContext
    const getSafeId = (c: OpenCase): string => {
        const id = c.assignmentId || c.id || c.case_number;
        return id ? id.toString() : 'unknown';
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string | number);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const { caseNumberCounts, agentCaseCounts } = useMemo(() => {
        const numCounts: Record<string, number> = {};
        const agentCounts: Record<string, number> = {};

        cases.forEach(c => {
            if (c.case_number) {
                const num = c.case_number.toString().trim();
                numCounts[num] = (numCounts[num] || 0) + 1;
            }
            if (c.owner_name) {
                const owner = c.owner_name.trim();
                agentCounts[owner] = (agentCounts[owner] || 0) + 1;
            }
        });
        return { caseNumberCounts: numCounts, agentCaseCounts: agentCounts };
    }, [cases]);

    const isShared = (c: OpenCase) => {
        const isDuplicate = c.case_number && caseNumberCounts[c.case_number.toString().trim()] > 1;
        const isSme = c.case_type && c.case_type.includes('Assigned by SME');
        return isDuplicate || isSme;
    };

    const isQueue = (ownerName?: string | null) => {
        if (!ownerName) return false;
        return ownerName.toLowerCase().includes('queue');
    };

    useEffect(() => {
        // ✅ استقبال البيانات كـ FormattedCase وعمل cast لـ OpenCase
        const unsubscribe = timerService.subscribeToAllOpenCases((incomingData: FormattedCase[]) => {
            const typedData = incomingData as OpenCase[];
            
            const sortedData = [...typedData].sort((a, b) => {
                const posA = a.queueRecord?.position || 999;
                const posB = b.queueRecord?.position || 999;
                return posA - posB;
            });

            setCases(sortedData);
            setLoading(false);
        });

        return () => { unsubscribe(); };
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setCases((items) => {
                const oldIndex = items.findIndex(c => getSafeId(c) === active.id);
                const newIndex = items.findIndex(c => getSafeId(c) === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    return arrayMove(items, oldIndex, newIndex);
                }
                return items;
            });
        }
        setActiveId(null);
    };

    const getCaseStatusInfo = (c: OpenCase) => {
        let start: Date | null = null;
        if (c.start_time && typeof c.start_time === 'string' && c.start_time.includes('T')) {
            start = new Date(c.start_time);
        } else if (c.start_date && c.start_time) {
            start = new Date(`${c.start_date}T${c.start_time}`);
        } else if (c.timestamp) {
            start = new Date(c.timestamp);
        }

        if (!start || isNaN(start.getTime())) return { status: 'Unknown', progress: 0, isExceeded: false };

        const now = new Date().getTime();
        const duration = Number(c.eta) || 0;
        const totalMs = duration * 60000;
        const endMs = start.getTime() + totalMs;

        if (start.getTime() > now) return { status: 'Scheduled', progress: 0, isExceeded: false };

        const elapsed = now - start.getTime();
        const progress = totalMs > 0 ? (elapsed / totalMs) * 100 : 0;

        return {
            isExceeded: now >= endMs,
            progress: Math.min(100, Math.max(0, progress))
        };
    };

    const tabFilteredCases = cases.filter(c => {
        const info = getCaseStatusInfo(c);
        const hasEta = c.eta && c.eta.toString().trim() !== '' && Number(c.eta) > 0;
        if (filterTab === 'exceeded') return info.isExceeded && hasEta;
        if (filterTab === 'near-exceeded') return !info.isExceeded && info.progress >= 75 && hasEta;
        if (filterTab === 'waiting-eta') return !hasEta && !isQueue(c.owner_name);
        if (filterTab === 'shared-cases') return isShared(c);
        if (filterTab === 'overloaded-agents') {
            const owner = c.owner_name ? c.owner_name.trim() : '';
            return (owner && agentCaseCounts[owner] > 1) || isQueue(owner);
        }
        return true;
    });

    const filteredCases = tabFilteredCases.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.trim().toLowerCase();
        const caseNum = c.case_number ? c.case_number.toString().toLowerCase() : '';
        const agentName = c.owner_name ? c.owner_name.toLowerCase() : '';
        const agentEmail = c.ownerEmail ? c.ownerEmail.toLowerCase() : '';
        const formattedAgent = c.ownerEmail ? formatAgentName(c.ownerEmail).toLowerCase() : '';
        const caseType = c.case_type ? c.case_type.toLowerCase() : '';

        return caseNum.includes(term) || agentName.includes(term) || agentEmail.includes(term) || formattedAgent.includes(term) || caseType.includes(term);
    });

    const sortableItemIds = useMemo(() => filteredCases.map(c => getSafeId(c)), [filteredCases]);

    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const counts = useMemo(() => {
        const groupCount = Object.keys(caseNumberCounts).filter(num => {
            const isDuplicate = caseNumberCounts[num] > 1;
            const hasSme = cases.some(c => c.case_number?.toString().trim() === num && c.case_type && c.case_type.includes('Assigned by SME'));
            return isDuplicate || hasSme;
        }).length;

        return {
            all: cases.length,
            exceeded: cases.filter(c => {
                const info = getCaseStatusInfo(c);
                const hasEta = c.eta && c.eta.toString().trim() !== '' && Number(c.eta) > 0;
                return info.isExceeded && hasEta;
            }).length,
            nearExceeded: cases.filter(c => {
                const info = getCaseStatusInfo(c);
                const hasEta = c.eta && c.eta.toString().trim() !== '' && Number(c.eta) > 0;
                return !info.isExceeded && info.progress >= 75 && hasEta;
            }).length,
            waitingEta: cases.filter(c => (!c.eta || c.eta.toString().trim() === '' || Number(c.eta) <= 0) && !isQueue(c.owner_name)).length,
            sharedCases: groupCount,
            overloadedAgents: cases.filter(c => {
                const owner = c.owner_name ? c.owner_name.trim() : '';
                return (owner && agentCaseCounts[owner] > 1) || isQueue(owner);
            }).length
        };
    }, [cases, caseNumberCounts, agentCaseCounts, tick]);

    const isDragEnabled = filterTab === 'all';

    const groupedSharedCases = useMemo(() => {
        if (filterTab !== 'shared-cases') return [];
        const groups: Record<string, OpenCase[]> = {};
        filteredCases.forEach(c => {
            const num = c.case_number ? c.case_number.toString().trim() : 'Unknown';
            if (!groups[num]) groups[num] = [];
            groups[num].push(c);
        });
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    }, [filteredCases, filterTab]);

    const getTabDescription = () => {
        switch (filterTab) {
            case 'exceeded': return "Cases that have passed their ETA limits.";
            case 'near-exceeded': return "Cases reaching 75% or more of their ETA.";
            case 'waiting-eta': return "Cases that haven't been submitted an ETA form yet.";
            case 'shared-cases': return "Cases being worked on by multiple agents at once.";
            case 'overloaded-agents': return "Unassigned queue cases and agents with multiple active cases.";
            default: return "Showing all currently active cases.";
        }
    };

    const getTabTitle = () => {
        switch (filterTab) {
            case 'exceeded': return "Exceeded Cases";
            case 'near-exceeded': return "Near Exceeded Cases";
            case 'waiting-eta': return "Cases Waiting For The ETA Form";
            case 'shared-cases': return "Shared Cases";
            case 'overloaded-agents': return "Queue And Multiple Cases";
            default: return "All Open Cases";
        }
    };

    if (loading) return <div className={styles.emptyState}>Loading active cases...</div>;

    return (
        <div className={styles.casesSection}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className={styles.headerContainer}>
                    <div className={styles.titleArea}>
                        <h2 className={styles.sectionTitle}>
                            {getTabTitle()} ({filteredCases.length})
                        </h2>
                    </div>
                    <span className={styles.tabDescriptionPill}>
                        💡 {getTabDescription()}
                    </span>
                    <AdminSearchInput
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                    />
                </div>

                <div className={styles.filterTabs}>
                    <button className={`${styles.tabBtn} ${filterTab === 'all' ? styles.active : ''}`} onClick={() => setFilterTab('all')}>
                        All <span className={styles.tabCount}>{counts.all}</span>
                    </button>
                    <button className={`${styles.tabBtn} ${styles.exceededTab} ${filterTab === 'exceeded' ? styles.active : ''}`} onClick={() => setFilterTab('exceeded')}>
                        Exceeded <span className={`${styles.tabCount} ${counts.exceeded > 0 ? styles.pulse : ''}`}>{counts.exceeded}</span>
                    </button>
                    <button className={`${styles.tabBtn} ${styles.nearExceededTab} ${filterTab === 'near-exceeded' ? styles.active : ''}`} onClick={() => setFilterTab('near-exceeded')}>
                        Near Exceeded <span className={`${styles.tabCount} ${counts.nearExceeded > 0 ? styles.pulse : ''}`}>{counts.nearExceeded}</span>
                    </button>
                    <button className={`${styles.tabBtn} ${filterTab === 'waiting-eta' ? styles.active : ''}`} onClick={() => setFilterTab('waiting-eta')}>
                        Waiting for Form <span className={`${styles.tabCount} ${counts.waitingEta > 0 ? styles.pulse : ''}`}>{counts.waitingEta}</span>
                    </button>
                    <button className={`${styles.tabBtn} ${filterTab === 'shared-cases' ? styles.active : ''}`} onClick={() => setFilterTab('shared-cases')}>
                        Shared Cases <span className={`${styles.tabCount} ${counts.sharedCases > 0 ? styles.pulse : ''}`}>{counts.sharedCases}</span>
                    </button>
                    <button className={`${styles.tabBtn} ${filterTab === 'overloaded-agents' ? styles.active : ''}`} onClick={() => setFilterTab('overloaded-agents')}>
                        Queue <span className={`${styles.tabCount} ${counts.overloadedAgents > 0 ? styles.pulse : ''}`}>{counts.overloadedAgents}</span>
                    </button>

                    <div className={`${styles.connectionStatus} ${isSalesforceConnected ? styles.statusConnected : styles.statusDisconnected}`}>
                        {!isSalesforceConnected && <BiWifiOff size={14} />}
                        <SiSalesforce size={20} />
                        <span>{isSalesforceConnected ? 'Salesforce Connected' : 'Salesforce Offline'}</span>
                    </div>
                </div>

                {filterTab === 'shared-cases' ? (
                    <div className={styles.groupedSection}>
                        {groupedSharedCases.map(([caseNum, groupCases]) => (
                            <CaseGroup key={caseNum} caseNumber={caseNum} cases={groupCases} />
                        ))}
                        {groupedSharedCases.length === 0 && <div className={styles.emptyState}>No shared cases found.</div>}
                    </div>
                ) : (
                    <SortableContext id="main-container" items={sortableItemIds} strategy={rectSortingStrategy} disabled={!isDragEnabled}>
                        <div className={styles.grid}>
                            {filteredCases.map(c => {
                                const id = getSafeId(c);
                                return (
                                    <SortableItem key={id} id={id}>
                                        {(dragListeners) => (
                                            <CaseCard data={c} isOpen={true} dragHandleProps={dragListeners} />
                                        )}
                                    </SortableItem>
                                );
                            })}
                        </div>
                    </SortableContext>
                )}

                <DragOverlay dropAnimation={null}>
                    {activeId ? (() => {
                        const activeCase = cases.find(c => getSafeId(c) === activeId);
                        if (!activeCase) return null;
                        return (
                            <div style={{ opacity: 0.9, cursor: 'grabbing', transform: 'scale(1.02)' }}>
                                <CaseCard data={activeCase} isOpen={true} />
                            </div>
                        );
                    })() : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

export default OpenCasesPage;