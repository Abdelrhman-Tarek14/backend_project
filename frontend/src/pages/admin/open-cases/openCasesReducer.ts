import type { OpenCase, SystemStatus } from './commonTypes';
import { arrayMove } from '@dnd-kit/sortable';

export interface OpenCasesState {
    cases: OpenCase[];
    loading: boolean;
    searchTerm: string;
    activeId: string | number | null;
    filterTab: string;
    systemStatus: SystemStatus[];
    tick: number;
}

export type OpenCasesAction =
    | { type: 'SET_CASES'; payload: OpenCase[] }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SEARCH_TERM'; payload: string }
    | { type: 'SET_ACTIVE_ID'; payload: string | number | null }
    | { type: 'SET_FILTER_TAB'; payload: string }
    | { type: 'UPDATE_SYSTEM_STATUS'; payload: SystemStatus }
    | { type: 'SET_SYSTEM_STATUS_LIST'; payload: SystemStatus[] }
    | { type: 'INCREMENT_TICK' }
    | { type: 'REORDER_CASES'; payload: { activeId: string | number; overId: string | number; getSafeId: (c: OpenCase) => string } };

export const initialState: OpenCasesState = {
    cases: [],
    loading: true,
    searchTerm: '',
    activeId: null,
    filterTab: 'on-time',
    systemStatus: [],
    tick: 0
};

export const openCasesReducer = (state: OpenCasesState, action: OpenCasesAction): OpenCasesState => {
    switch (action.type) {
        case 'SET_CASES':
            return { ...state, cases: action.payload, loading: false };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_SEARCH_TERM':
            return { ...state, searchTerm: action.payload };
        case 'SET_ACTIVE_ID':
            return { ...state, activeId: action.payload };
        case 'SET_FILTER_TAB':
            return { ...state, filterTab: action.payload };
        case 'SET_SYSTEM_STATUS_LIST':
            return { ...state, systemStatus: action.payload };
        case 'UPDATE_SYSTEM_STATUS': {
            const status = action.payload;
            const existing = state.systemStatus.findIndex(s => s.system === status.system);
            if (existing !== -1) {
                const newList = [...state.systemStatus];
                newList[existing] = status;
                return { ...state, systemStatus: newList };
            }
            return { ...state, systemStatus: [...state.systemStatus, status] };
        }
        case 'INCREMENT_TICK':
            return { ...state, tick: state.tick + 1 };
        case 'REORDER_CASES': {
            const { activeId, overId, getSafeId } = action.payload;
            const oldIndex = state.cases.findIndex(c => getSafeId(c) === activeId);
            const newIndex = state.cases.findIndex(c => getSafeId(c) === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                return { ...state, cases: arrayMove(state.cases, oldIndex, newIndex) };
            }
            return state;
        }
        default:
            return state;
    }
};
