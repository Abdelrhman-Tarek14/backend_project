import apiClient from '../../../services/apiClient';
import socketService from '../../../services/socket';

export const timerService = {
    /**
     * Listen to active cases (Open) for a specific agent using WebSockets and initial fetch.
     */
    subscribeToActiveCases: (email, callback) => {
        if (!email) return () => { };

        let activeCases = [];

        const updateCallback = (updatedCase) => {
            // Find and update the case in our local list
            const index = activeCases.findIndex(c => c.assignmentId === updatedCase.assignmentId || c.id === updatedCase.caseId);
            if (index !== -1) {
                activeCases[index] = { ...activeCases[index], ...updatedCase };
                callback([...activeCases]);
            } else {
                // If not found, re-fetch for accuracy
                timerService.getActiveCases().then(cases => {
                    activeCases = cases;
                    callback(cases);
                });
            }
        };

        const refreshCallback = () => {
             timerService.getActiveCases().then(cases => {
                activeCases = cases;
                callback(cases);
            });
        }

        // Initial fetch
        timerService.getActiveCases().then(cases => {
            activeCases = cases;
            callback(cases);
        });

        // Socket listeners
        socketService.on('case_updated', updateCallback);
        socketService.on('queue_updated', refreshCallback);
        socketService.on('leaderboard_updated', refreshCallback);

        return () => {
            socketService.off('case_updated', updateCallback);
            socketService.off('queue_updated', refreshCallback);
            socketService.off('leaderboard_updated', refreshCallback);
        };
    },

    /**
     * Fetch active cases for current user
     */
    getActiveCases: async () => {
        try {
            const response = await apiClient.get('/cases', { params: { status: 'OPEN' } });
            return (response.data.data || []).map(caseItem => {
                const activeAssignment = caseItem.assignments?.[0];
                return {
                    ...caseItem,
                    assignmentId: activeAssignment?.id,
                    case_number: caseItem.caseNumber,
                    case_type: activeAssignment?.caseType || caseItem.caseType || 'N/A',
                    form_type: activeAssignment?.formType || 'N/A',
                    owner_name: activeAssignment?.user?.name || activeAssignment?.user?.email || 'N/A',
                    start_time: activeAssignment?.startTime,
                    eta: activeAssignment?.etaMinutes,
                    tl_name: activeAssignment?.user?.leader?.name || 'N/A',
                };
            });
        } catch (error) {
            console.error("Error fetching active cases:", error);
            return [];
        }
    },

    /**
     * Fetch closed cases using pagination from the backend
     */
    getClosedCases: async (page = 1, limit = 10) => {
        try {
            const response = await apiClient.get('/cases', { 
                params: { status: 'CLOSED', page, limit } 
            });
            
            return (response.data.data || []).map(caseItem => {
                const closedAssignment = caseItem.assignments?.[0];
                
                // Helper to calculate completion status and ETA based on backend fields
                let expectedEndIso = null;
                let completionStatus = 'N/A';
                
                if (closedAssignment?.startTime && closedAssignment?.etaMinutes) {
                    const startMs = new Date(closedAssignment.startTime).getTime();
                    const expectedEndMs = startMs + (closedAssignment.etaMinutes * 60000);
                    expectedEndIso = new Date(expectedEndMs).toISOString();
                    
                    if (closedAssignment?.closedAt) {
                        const closedMs = new Date(closedAssignment.closedAt).getTime();
                        completionStatus = closedMs <= expectedEndMs ? 'On-Time' : 'Exceeding';
                    }
                }

                return {
                    ...caseItem,
                    assignmentId: closedAssignment?.id,
                    case_number: caseItem.caseNumber,
                    case_type: closedAssignment?.caseType || caseItem.caseType || 'N/A',
                    form_type: closedAssignment?.formType || 'N/A',
                    owner_name: closedAssignment?.user?.name || closedAssignment?.user?.email || 'N/A',
                    start_date: closedAssignment?.startTime ? new Date(closedAssignment.startTime).toLocaleDateString() : null,
                    start_time: closedAssignment?.startTime ? new Date(closedAssignment.startTime).toLocaleTimeString() : null,
                    timestamp: closedAssignment?.assignedAt || caseItem.createdAt,
                    closed_at: closedAssignment?.closedAt ? new Date(closedAssignment.closedAt).toLocaleTimeString() : null,
                    timestamp_closed_iso: closedAssignment?.closedAt,
                    eta: closedAssignment?.etaMinutes,
                    expected_end_iso: expectedEndIso,
                    completion_status: completionStatus
                };
            });
        } catch (error) {
            console.error("Error fetching closed cases:", error);
            return [];
        }
    },

    /**
     * Complete a case (Close assignment)
     */
    completeCase: async (caseData) => {
        if (!caseData) return;
        const assignmentId = caseData.assignmentId || caseData.id;
        try {
            await apiClient.patch(`/cases/assignments/${assignmentId}`, {
                status: 'CLOSED',
                closedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error("Error completing case:", error);
            throw error;
        }
    },

    /**
     * Update the start time of an active case
     */
    updateActiveCaseStartTime: async (assignmentId, newTime) => {
        if (!assignmentId) return;
        try {
            const date = new Date(newTime);
            await apiClient.patch(`/cases/assignments/${assignmentId}`, {
                startTime: date.toISOString()
            });
        } catch (error) {
            console.error("Error updating start time:", error);
            throw error;
        }
    },

    /**
     * Update the ETA of an active case
     */
    updateActiveCaseEta: async (assignmentId, newEta) => {
        if (!assignmentId || !newEta) return;
        try {
            await apiClient.patch(`/cases/assignments/${assignmentId}`, {
                etaMinutes: Number(newEta)
            });
        } catch (error) {
            console.error("Error updating ETA:", error);
            throw error;
        }
    },

    /**
     * Update any field
     */
    updateActiveCaseField: async (assignmentId, field, value) => {
        if (!assignmentId || !field) return;
        
        const fieldMapping = {
            'case_type': 'caseType',
            'form_type': 'formType',
            'start_time': 'startTime',
            'eta': 'etaMinutes'
        };

        const backendField = fieldMapping[field] || field;

        try {
            await apiClient.patch(`/cases/assignments/${assignmentId}`, {
                [backendField]: value
            });
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            throw error;
        }
    },

    updateActiveCaseType: (assignmentId, newType) => timerService.updateActiveCaseField(assignmentId, 'case_type', newType),

    /**
     * ADMIN: Listen to ALL open cases
     */
    subscribeToAllOpenCases: (callback) => {
        const refreshAll = async () => {
             try {
                const response = await apiClient.get('/cases', { params: { status: 'OPEN', limit: 100 } });
                const assignments = (response.data.data || []).flatMap(c => 
                    (c.assignments || []).map(a => ({
                        ...c,
                        ...a,
                        assignmentId: a.id,
                        case_number: c.caseNumber,
                        case_type: a.caseType || c.caseType || 'N/A',
                        form_type: a.formType || 'N/A',
                        owner_name: a.user?.name || a.ownerEmail || 'Unknown',
                        start_time: a.startTime,
                        eta: a.etaMinutes,
                        timestamp: a.assignedAt || c.createdAt,
                        tl_name: a.user?.leader?.name || 'N/A'
                    }))
                );
                callback(assignments);
            } catch (error) {
                console.error("Error fetching all cases:", error);
            }
        };

        refreshAll();

        socketService.on('case_updated', refreshAll);
        socketService.on('queue_updated', refreshAll);

        return () => {
            socketService.off('case_updated', refreshAll);
            socketService.off('queue_updated', refreshAll);
        };
    },

    /**
     * Send exceeded case data to Apps Script
     */
    triggerExceededAlert: async (caseData) => {
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxwvmfyYiiIv6sUvk6kuWmbPrl7VCgdQ2Q3SbiFZsj6cy93f4bzCV1FfpLy6BDBZMXP/exec";
        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(caseData)
            });
        } catch (error) {
            console.error("❌ Failed to send exceeded alert:", error);
        }
    },
};
