import { useState, useEffect, useMemo } from 'react';
import { BiWindows, BiWifi, BiWifiOff } from 'react-icons/bi';
import { usePiP } from '../../context/PiPContext';
import apiClient from '../../services/apiClient';
// 1. dnd-kit imports
import {
    DndContext,
    closestCenter,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay
    // useDroppable
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy
} from '@dnd-kit/sortable';

import { timerService } from '../../features/timer/services/timerService';
import { CaseCard } from './components/CaseCard';
import { CaseGroup } from './components/CaseGroup';
import { AdminSearchInput } from './components/AdminSearchInput';
import { SortableItem } from './components/SortableItem';
import styles from './OpenCases.module.css';
import { formatAgentName } from '../../utils/formatters';
import { mergeWithSavedOrder } from '../../utils/caseHelpers';
import { SiSalesforce } from "react-icons/si";
import { useAppControls } from './hooks/useAppControls';
import { useUserRole } from '../../hooks/useUserRole';


// const Droppable = ({ id, children, className }) => {
//     const { setNodeRef } = useDroppable({ id });
//     return (
//         <div
//             ref={setNodeRef}
//             className={className}
//         >
//             {children}
//         </div>
//     );
// };

const OpenCasesPage = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'exceeded', 'near-exceeded', 'waiting-eta', 'shared-cases'
    const [systemStatus, setSystemStatus] = useState([]);

    // Fetch System Integration Status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await apiClient.get('/cases/system/status');
                setSystemStatus(response.data || []);
            } catch (err) {
                console.error("Failed to fetch system status:", err);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const isSalesforceConnected = useMemo(() => {
        const sf = systemStatus.find(s => s.system === 'salesforce');
        return sf?.status === 'OK';
    }, [systemStatus]);

    // Fetch Global Controls & Role ONCE for performance
    const controls = useAppControls();
    const { isCMD } = useUserRole();

    const getSafeId = (c) => (c.assignmentId || c.id || c.case_number).toString();
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    // 1. Identify Duplicates
    // 1. Identify Duplicates & Overloaded Agents
    const { caseNumberCounts, agentCaseCounts } = useMemo(() => {
        const numCounts = {};
        const agentCounts = {};

        cases.forEach(c => {
            // Case Number duplicates
            if (c.case_number) {
                const num = c.case_number.toString().trim();
                numCounts[num] = (numCounts[num] || 0) + 1;
            }

            // Agent Case counts
            if (c.owner_name) {
                const owner = c.owner_name.trim();
                agentCounts[owner] = (agentCounts[owner] || 0) + 1;
            }
        });

        return { caseNumberCounts: numCounts, agentCaseCounts: agentCounts };
    }, [cases]);

    const isShared = (c) => {
        const isDuplicate = c.case_number && caseNumberCounts[c.case_number.toString().trim()] > 1;
        const isSme = c.case_type && c.case_type.includes('Assigned by SME');
        return isDuplicate || isSme;
    };

    const isQueue = (ownerName) => {
        if (!ownerName) return false;
        return ownerName.toLowerCase().includes('queue');
    };

    // useEffect(() => {
    //     const unsubscribe = timerService.subscribeToAllOpenCases((incomingData) => {
    //         const savedOrder = JSON.parse(localStorage.getItem('cases_custom_order') || '[]');
    //         const sortedData = mergeWithSavedOrder(incomingData, savedOrder);
    //         setCases(sortedData);
    //         setLoading(false);
    //     });
    //     return () => {
    //         unsubscribe();
    //     };
    // }, []);
    useEffect(() => {
        const unsubscribe = timerService.subscribeToAllOpenCases((incomingData) => {
            // Sort by Queue Position from backend
            incomingData.sort((a, b) => {
                const posA = a.queueRecord?.position || 999;
                const posB = b.queueRecord?.position || 999;
                return posA - posB;
            });

            setCases([...incomingData]);
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 10 }
        }),
        useSensor(TouchSensor)
    );

    const handleDragEnd = (event) => {
        // Drag logic can be re-implemented later to update queue positions via API
        setActiveId(null);
    };

    const getCaseStatusInfo = (c) => {
        let start = null;
        if (c.start_time && typeof c.start_time === 'string' && c.start_time.includes('T')) {
            start = new Date(c.start_time);
        } else if (c.start_date && c.start_time) {
            start = new Date(`${c.start_date}T${c.start_time}`);
        } else if (c.timestamp) {
            start = new Date(c.timestamp);
        }

        if (!start || isNaN(start.getTime())) return { status: 'Unknown', progress: 0 };

        const now = new Date();
        const duration = Number(c.eta) || 0;
        const totalMs = duration * 60000;
        const end = new Date(start.getTime() + totalMs);

        const timeUntilStart = start - now;
        if (timeUntilStart > 0) return { status: 'Scheduled', progress: 0 };

        const remaining = end - now;
        const elapsed = now - start;
        const progress = totalMs > 0 ? (elapsed / totalMs) * 100 : 0;

        return {
            isOverdue: remaining <= 0,
            progress: Math.min(100, Math.max(0, progress))
        };
    };

    const tabFilteredCases = cases.filter(c => {
        const info = getCaseStatusInfo(c);
        const hasEta = c.eta && c.eta.toString().trim() !== '' && Number(c.eta) > 0;

        if (filterTab === 'exceeded') return info.isOverdue && hasEta;
        if (filterTab === 'near-exceeded') return !info.isOverdue && info.progress >= 75 && hasEta;
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
        const agentEmail = c.agent_email ? c.agent_email.toLowerCase() : '';
        const formattedAgent = c.agent_email ? formatAgentName(c.agent_email).toLowerCase() : '';
        const caseType = c.case_type ? c.case_type.toLowerCase() : '';

        return caseNum.includes(term) ||
            agentName.includes(term) ||
            agentEmail.includes(term) ||
            formattedAgent.includes(term) ||
            caseType.includes(term);
    });

    // 3. Heartbeat for real-time counts (Exceeding/Near Exceeded rely on current time)
    const [tick, setTick] = useState(0);
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
                return info.isOverdue && hasEta;
            }).length,
            nearExceeded: cases.filter(c => {
                const info = getCaseStatusInfo(c);
                const hasEta = c.eta && c.eta.toString().trim() !== '' && Number(c.eta) > 0;
                return !info.isOverdue && info.progress >= 75 && hasEta;
            }).length,
            waitingEta: cases.filter(c => (!c.eta || c.eta.toString().trim() === '' || Number(c.eta) <= 0) && !isQueue(c.owner_name)).length,
            sharedCases: groupCount,
            overloadedAgents: cases.filter(c => {
                const owner = c.owner_name ? c.owner_name.trim() : '';
                return (owner && agentCaseCounts[owner] > 1) || isQueue(owner);
            }).length
        };
    }, [cases, caseNumberCounts, agentCaseCounts, tick]); // tick ensures re-calc every second

    const isDragEnabled = filterTab === 'all';

    // 2. Grouping Logic for Shared Tab
    const groupedSharedCases = useMemo(() => {
        if (filterTab !== 'shared-cases') return [];
        const groups = {};
        filteredCases.forEach(c => {
            const num = c.case_number ? c.case_number.toString().trim() : 'Unknown';
            if (!groups[num]) groups[num] = [];
            groups[num].push(c);
        });
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length); // Show highest agent count first
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

    if (loading) return <div>Loading active cases...</div>;

    return (
        <div className={styles.casesSection}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div style={{ padding: '0 1rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                                {getTabTitle()} ({filteredCases.length})
                            </h2>
                            <span style={{
                                fontSize: '0.85rem',
                                color: '#666',
                                background: 'rgba(0,0,0,0.05)',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontWeight: '600'
                            }}>
                                💡 {getTabDescription()}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                            <AdminSearchInput
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.filterTabs}>
                        <button
                            className={`${styles.tabBtn} ${filterTab === 'all' ? styles.active : ''}`}
                            onClick={() => setFilterTab('all')}
                        >
                            All <span className={styles.tabCount}>{counts.all}</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${styles.exceededTab} ${filterTab === 'exceeded' ? styles.active : ''}`}
                            onClick={() => setFilterTab('exceeded')}
                        >
                            Exceeded <span className={`${styles.tabCount} ${counts.exceeded > 0 ? styles.pulse : ''}`}>{counts.exceeded}</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${styles.nearExceededTab} ${filterTab === 'near-exceeded' ? styles.active : ''}`}
                            onClick={() => setFilterTab('near-exceeded')}
                        >
                            Near Exceeded <span className={`${styles.tabCount} ${counts.nearExceeded > 0 ? styles.pulse : ''}`}>{counts.nearExceeded}</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${filterTab === 'waiting-eta' ? styles.active : ''}`}
                            onClick={() => setFilterTab('waiting-eta')}
                        >
                            Waiting for Form <span className={`${styles.tabCount} ${counts.waitingEta > 0 ? styles.pulse : ''}`}>{counts.waitingEta}</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${filterTab === 'shared-cases' ? styles.active : ''}`}
                            onClick={() => setFilterTab('shared-cases')}
                        >
                            Shared Cases <span className={`${styles.tabCount} ${counts.sharedCases > 0 ? styles.pulse : ''}`}>{counts.sharedCases}</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${filterTab === 'overloaded-agents' ? styles.active : ''}`}
                            onClick={() => setFilterTab('overloaded-agents')}
                        >
                            Queue <span className={`${styles.tabCount} ${counts.overloadedAgents > 0 ? styles.pulse : ''}`}>{counts.overloadedAgents}</span>
                        </button>

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                            {isSalesforceConnected ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    {/* <BiWifi size={16} />  */}
                                    <SiSalesforce size={24} /> Salesforce Connected
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(244, 67, 54, 0.15)', color: '#F44336', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    <BiWifiOff size={16} />
                                    <SiSalesforce size={24} /> Salesforce Disconnected
                                </div>
                            )}
                        </div>
                    </div>

                    {filterTab === 'shared-cases' ? (
                        <div className={styles.groupedSection}>
                            {groupedSharedCases.map(([caseNum, groupCases]) => (
                                <CaseGroup
                                    key={caseNum}
                                    caseNumber={caseNum}
                                    cases={groupCases}
                                    controls={controls}
                                    isCMD={isCMD}
                                />
                            ))}
                            {groupedSharedCases.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                                    No shared cases found.
                                </div>
                            )}
                        </div>
                    ) : (
                        <SortableContext
                            id="main-container"
                            items={filteredCases.map(c => getSafeId(c))}
                            strategy={rectSortingStrategy}
                            disabled={!isDragEnabled}
                        >

                            <div className={styles.grid}>
                                {filteredCases.map(c => {
                                    const id = getSafeId(c);
                                    return (
                                        <SortableItem key={id} id={id}>
                                            {(dragListeners) => (
                                                <CaseCard
                                                    data={c}
                                                    isOpen={true}
                                                    dragHandleProps={dragListeners}
                                                    controls={controls}
                                                    isCMD={isCMD}
                                                />
                                            )}
                                        </SortableItem>
                                    );
                                })}
                            </div>
                        </SortableContext>
                    )}
                </div>
                <DragOverlay dropAnimation={null}>
                    {activeId ? (() => {
                        const activeCase = cases.find(c => getSafeId(c) === activeId);
                        if (!activeCase) return null;
                        return (
                            <div style={{ opacity: 0.9, cursor: 'grabbing', transform: 'scale(1.02)' }}>
                                <CaseCard
                                    data={activeCase}
                                    isOpen={true}
                                    controls={controls}
                                    isCMD={isCMD}
                                />
                            </div>
                        );
                    })() : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

export default OpenCasesPage;