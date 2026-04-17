import React, { useEffect, useMemo, useReducer } from 'react';
import {
    DndContext,
    closestCenter,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

import { casesApi } from '../../../api/casesApi';
import { timerService } from '../../../features/timer/services/timerService';
import type { FormattedCase } from '../../../features/timer/services/timerService';
import { formatAgentName } from '../../../utils/formatters';
import socketService from '../../../services/socket';

// Components
import { OpenCasesHeader } from './components/OpenCasesHeader';
import { OpenCasesStats } from './components/OpenCasesStats';
import { OpenCasesGrid } from './components/OpenCasesGrid';
import { OpenCasesGrouped } from './components/OpenCasesGrouped';
import { OpenCasesOverlay } from './components/OpenCasesOverlay';

// State & Types
import { openCasesReducer, initialState } from './openCasesReducer';
import type { OpenCase, SystemStatus } from './commonTypes';
import styles from './OpenCases.module.css';

const OpenCasesPage: React.FC = () => {
    const [state, dispatch] = useReducer(openCasesReducer, initialState);
    const { cases, loading, searchTerm, activeId, filterTab, systemStatus, tick } = state;

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await casesApi.getSalesforceSyncStatus();
                const { status: apiStatus, ...rest } = response.data;

                const sfData: SystemStatus = {
                    system: 'salesforce',
                    status: apiStatus === 'online' ? 'OK' : 'Offline',
                    ...rest
                };

                dispatch({ type: 'SET_SYSTEM_STATUS_LIST', payload: [sfData] });
            } catch (err) {
                console.error("Failed to fetch system status:", err);
                dispatch({ type: 'SET_SYSTEM_STATUS_LIST', payload: [] });
            }
        };

        fetchStatus();

        const handleHeartbeat = (status: SystemStatus) => {
            dispatch({ type: 'UPDATE_SYSTEM_STATUS', payload: status });
        };

        socketService.on('sf_heartbeat', handleHeartbeat);
        return () => { socketService.off('sf_heartbeat', handleHeartbeat); };
    }, []);

    const isSalesforceConnected = useMemo(() => {
        const sf = systemStatus.find(s => s.system === 'salesforce');
        return sf?.status === 'OK';
    }, [systemStatus]);

    const getSafeId = (c: OpenCase): string => {
        const id = c.assignmentId || c.id || c.case_number;
        return id ? id.toString() : 'unknown';
    };

    const handleDragStart = (event: DragStartEvent) => {
        dispatch({ type: 'SET_ACTIVE_ID', payload: event.active.id as string | number });
    };

    const handleDragCancel = () => {
        dispatch({ type: 'SET_ACTIVE_ID', payload: null });
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            dispatch({
                type: 'REORDER_CASES',
                payload: {
                    activeId: active.id as string | number,
                    overId: over.id as string | number,
                    getSafeId
                }
            });
        }
        dispatch({ type: 'SET_ACTIVE_ID', payload: null });
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

    useEffect(() => {
        const unsubscribe = timerService.subscribeToAllOpenCases((incomingData: FormattedCase[]) => {
            const typedData = incomingData as OpenCase[];
            const sortedData = [...typedData].sort((a, b) => {
                const posA = a.queueRecord?.position || 999;
                const posB = b.queueRecord?.position || 999;
                return posA - posB;
            });
            dispatch({ type: 'SET_CASES', payload: sortedData });
        });
        return () => { unsubscribe(); };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => dispatch({ type: 'INCREMENT_TICK' }), 1000);
        return () => clearInterval(timer);
    }, []);

    const getCaseStatusInfo = (c: OpenCase) => {
        let start: Date | null = null;
        if (c.start_time && typeof c.start_time === 'string' && c.start_time.includes('T')) {
            start = new Date(c.start_time);
        } else if (c.start_date && c.start_time) {
            start = new Date(`${c.start_date}T${c.start_time}`);
        } else if (c.timestamp) {
            start = new Date(c.timestamp);
        }

        if (!start || isNaN(start.getTime())) return { isExceeded: false, progress: 0 };

        const now = new Date().getTime();
        const duration = Number(c.eta) || 0;
        const totalMs = duration * 60000;
        const endMs = start.getTime() + totalMs;

        const elapsed = now - start.getTime();
        const progress = totalMs > 0 ? (elapsed / totalMs) * 100 : 0;

        return {
            isExceeded: now >= endMs,
            progress: Math.min(100, Math.max(0, progress))
        };
    };

    const tabFilteredCases = useMemo(() => {
        return cases.filter(c => {
            const info = getCaseStatusInfo(c);
            const hasEta = c.eta && c.eta.toString().trim() !== '' && Number(c.eta) > 0;
            const isSharedCase = c.case_number && caseNumberCounts[c.case_number.toString().trim()] > 1 || (c.case_type && c.case_type.includes('Assigned by SME'));

            if (filterTab === 'exceeded') return info.isExceeded && hasEta;
            if (filterTab === 'near-exceeded') return !info.isExceeded && info.progress >= 75 && hasEta;
            if (filterTab === 'waiting-eta') return !hasEta && !(c.owner_name?.toLowerCase().includes('queue'));
            if (filterTab === 'shared-cases') return isSharedCase;
            if (filterTab === 'overloaded-agents') {
                const owner = c.owner_name ? c.owner_name.trim() : '';
                return (owner && agentCaseCounts[owner] > 1) || owner.toLowerCase().includes('queue');
            }
            return true;
        });
    }, [cases, filterTab, agentCaseCounts, caseNumberCounts, tick]);

    const filteredCases = useMemo(() => {
        if (!searchTerm) return tabFilteredCases;
        const term = searchTerm.trim().toLowerCase();
        return tabFilteredCases.filter(c => {
            const caseNum = c.case_number ? c.case_number.toString().toLowerCase() : '';
            const agentName = c.owner_name ? c.owner_name.toLowerCase() : '';
            const agentEmail = c.ownerEmail ? c.ownerEmail.toLowerCase() : '';
            const formattedAgent = c.ownerEmail ? formatAgentName(c.ownerEmail).toLowerCase() : '';
            const caseType = c.case_type ? c.case_type.toLowerCase() : '';
            return caseNum.includes(term) || agentName.includes(term) || agentEmail.includes(term) || formattedAgent.includes(term) || caseType.includes(term);
        });
    }, [tabFilteredCases, searchTerm]);

    const counts = useMemo(() => {
        const sharedCount = Object.keys(caseNumberCounts).filter(num => {
            const isDuplicate = caseNumberCounts[num] > 1;
            const hasSme = cases.some(c => c.case_number?.toString().trim() === num && c.case_type && c.case_type.includes('Assigned by SME'));
            return isDuplicate || hasSme;
        }).length;

        return {
            all: cases.length,
            exceeded: cases.filter(c => {
                const info = getCaseStatusInfo(c);
                return info.isExceeded && c.eta && Number(c.eta) > 0;
            }).length,
            nearExceeded: cases.filter(c => {
                const info = getCaseStatusInfo(c);
                return !info.isExceeded && info.progress >= 75 && c.eta && Number(c.eta) > 0;
            }).length,
            waitingEta: cases.filter(c => (!c.eta || Number(c.eta) <= 0) && !(c.owner_name?.toLowerCase().includes('queue'))).length,
            sharedCases: sharedCount,
            overloadedAgents: cases.filter(c => {
                const owner = c.owner_name ? c.owner_name.trim() : '';
                return (owner && agentCaseCounts[owner] > 1) || owner.toLowerCase().includes('queue');
            }).length
        };
    }, [cases, caseNumberCounts, agentCaseCounts, tick]);

    const groupedSharedCases = useMemo(() => {
        if (filterTab !== 'shared-cases') return [];
        const groups: Record<string, OpenCase[]> = {};
        filteredCases.forEach(c => {
            const num = c.case_number ? c.case_number.toString().trim() : 'Unknown';
            if (!groups[num]) groups[num] = [];
            groups[num].push(c);
        });
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length) as [string, OpenCase[]][];
    }, [filteredCases, filterTab]);

    const Descriptions: Record<string, string> = {
        exceeded: "Cases that have passed their ETA limits.",
        'near-exceeded': "Cases reaching 75% or more of their ETA.",
        'waiting-eta': "Cases that haven't been submitted an ETA form yet.",
        'shared-cases': "Cases being worked on by multiple agents at once.",
        'overloaded-agents': "Unassigned queue cases and agents with multiple active cases.",
        all: "Showing all currently active cases."
    };

    const Titles: Record<string, string> = {
        exceeded: "Exceeded Cases",
        'near-exceeded': "Near Exceeded Cases",
        'waiting-eta': "Cases Waiting For The ETA Form",
        'shared-cases': "Shared Cases",
        'overloaded-agents': "Queue And Multiple Cases",
        all: "All Open Cases"
    };

    const sortableItemIds = useMemo(() => filteredCases.map(c => getSafeId(c)), [filteredCases]);

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
                <OpenCasesHeader
                    title={Titles[filterTab]}
                    description={Descriptions[filterTab]}
                    searchTerm={searchTerm}
                    onSearchChange={(val) => dispatch({ type: 'SET_SEARCH_TERM', payload: val })}
                    count={filteredCases.length}
                />

                <OpenCasesStats
                    filterTab={filterTab}
                    onTabChange={(tab) => dispatch({ type: 'SET_FILTER_TAB', payload: tab })}
                    counts={counts}
                    isSalesforceConnected={isSalesforceConnected}
                />

                {filterTab === 'shared-cases' ? (
                    <OpenCasesGrouped groupedSharedCases={groupedSharedCases} />
                ) : (
                    <OpenCasesGrid
                        cases={filteredCases}
                        sortableItemIds={sortableItemIds}
                        isDragEnabled={filterTab === 'all'}
                        getSafeId={getSafeId}
                    />
                )}

                <OpenCasesOverlay activeId={activeId} cases={cases} getSafeId={getSafeId} />
            </DndContext>
        </div>
    );
};

export default OpenCasesPage;