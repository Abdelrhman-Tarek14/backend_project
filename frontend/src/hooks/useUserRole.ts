import { useUserContext } from '../context/UserContext';
import type { UserContextType } from '../context/UserContext'; 

/**
 * useUserRole hook
 * Now acts as a proxy for UserContext to maintain backward compatibility
 * but eliminates redundant Firestore listeners.
 */
export function useUserRole(): UserContextType {
    return useUserContext();
}
