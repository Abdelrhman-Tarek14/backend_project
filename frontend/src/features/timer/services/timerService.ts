import { casesApi } from '../../../api/casesApi';
import socketService from '../../../services/socket';

export interface FormattedCase {
    assignmentId?: string | number;
    case_number: string | number;
    case_type: string;
    ownerEmail: string | null;
    start_time: string | null;
    eta: number | null;
    assignedBy: string | null;
    tl_name: string;
    timestamp: string | null;
    [key: string]: any;
}

// ==========================================
//  Helper: Unified Data Mapping & Fallbacks
// ==========================================
const formatCaseData = (item: any): FormattedCase => {
    // Handle both Flat Assignment objects and Case objects with nested assignments
    // If item.assignments is missing, assume item IS the assignment
    const isFlatAssignment = !item.assignments;
    const assignment = isFlatAssignment ? item : (item.assignments?.[0] || {});
    const parentCase = isFlatAssignment ? (item.case || {}) : item;

    console.debug('[timerService] Mapping item:', { isFlatAssignment, id: item.id, caseNumber: parentCase.caseNumber });

    return {
        ...item,
        assignmentId: assignment.id,
        case_number: parentCase.caseNumber || item.caseNumber || 'Not Found',
        case_type: assignment.formType || assignment.caseType || 'Not Found',
        owner_name: assignment.user?.name || assignment.ownerName || 'Not Found',
        ownerEmail: assignment.user?.email || assignment.ownerEmail || null,
        start_time: assignment.startTime || null,
        eta: assignment.etaMinutes || null,
        assignedBy: assignment.assignedBy || null,
        tl_name: assignment.user?.leader?.name || 'Not Found',
        timestamp: assignment.startTime || item.createdAt || null,
    };
};

export const timerService = {
    // ==========================================
    //  1. Agent Logic (Active Cases & Sockets)
    // ==========================================
    subscribeToActiveCases: (email: string | undefined, callback: (cases: FormattedCase[]) => void) => {
        if (!email) return () => { };

        let activeCases: FormattedCase[] = [];

        const updateCallback = (updatedCase: any) => {
            const index = activeCases.findIndex(c => c.assignmentId === updatedCase.assignmentId || c.id === updatedCase.caseId);
            if (index !== -1) {
                const mappedCase: Partial<FormattedCase> = { ...updatedCase };

                if (updatedCase.etaMinutes !== undefined) mappedCase.eta = updatedCase.etaMinutes;
                if (updatedCase.startTime !== undefined) mappedCase.start_time = updatedCase.startTime;
                if (updatedCase.formType !== undefined || updatedCase.caseType !== undefined) {
                    mappedCase.case_type = updatedCase.formType || updatedCase.caseType;
                }

                activeCases[index] = { ...activeCases[index], ...mappedCase };
                callback([...activeCases]);
            } else {
                refreshCallback();
            }
        };

        const refreshCallback = () => {
            timerService.getActiveCases(email).then(cases => {
                activeCases = cases;
                callback(cases);
            });
        }

        // Initial fetch
        refreshCallback();

        // Socket listeners
        socketService.on('case_updated', updateCallback);
        socketService.on('case_assigned', refreshCallback);
        socketService.on('case_closed', refreshCallback);
        socketService.on('queue_updated', refreshCallback);
        socketService.on('leaderboard_updated', refreshCallback);

        return () => {
            socketService.off('case_updated', updateCallback);
            socketService.off('case_assigned', refreshCallback);
            socketService.off('case_closed', refreshCallback);
            socketService.off('queue_updated', refreshCallback);
            socketService.off('leaderboard_updated', refreshCallback);
        };
    },

    getActiveCases: async (email?: string): Promise<FormattedCase[]> => {
        try {
            const params: any = { status: 'OPEN' };
            if (email) params.agentEmail = email;

            const response = await casesApi.getCases(params);
            
            // Handle { data: [], meta: {} } or raw []
            const rawData = (response.data as any)?.data || response.data;
            const cases = Array.isArray(rawData) ? rawData : [];
            
            console.log(`[timerService] getActiveCases: Received ${cases.length} cases`, cases);
            return cases.map(formatCaseData);
        } catch (error) {
            console.error("Error fetching active cases:", error);
            return [];
        }
    },

    // ==========================================
    //  2. Admin Logic (All Open Cases)
    // ==========================================
    subscribeToAllOpenCases: (callback: (cases: FormattedCase[]) => void) => {
        const refreshAll = async () => {
            try {
                const response = await casesApi.getCases({ status: 'OPEN', limit: 100 });

                // Handle { data: [], meta: {} } or raw []
                const rawData = (response.data as any)?.data || response.data;
                const cases = Array.isArray(rawData) ? rawData : [];
                
                console.log(`[timerService] subscribeToAllOpenCases: Received ${cases.length} cases`, cases);
                
                const formattedCases = cases.map(formatCaseData);
                callback(formattedCases);
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

    // ==========================================
    //  3. Actions & Updates
    // ==========================================

    updateAssignment: async (assignmentId: string | number, data: any) => {
        if (!assignmentId || !data) return;
        try {
            const response = await casesApi.updateAssignmentParameters(String(assignmentId), data);
            return response.data;
        } catch (error) {
            console.error("Error updating assignment:", error);
            throw error;
        }
    },

    completeCase: async (caseData: FormattedCase) => {
        if (!caseData) return;

        const assignmentId = caseData.assignmentId || caseData.id;

        try {
            if (assignmentId) {
                await timerService.updateAssignment(assignmentId, {
                    status: 'CLOSED',
                    closedAt: new Date().toISOString()
                });
                return true;
            }
        } catch (error) {
            console.error("Error completing case:", error);
            throw error;
        }
    }
};