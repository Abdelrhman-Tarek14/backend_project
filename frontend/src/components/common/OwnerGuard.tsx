// import { useUserRole } from '../../hooks/useUserRole';

// /**
//  * Reusable Guard Component to restrict access to the 'owner' (isSuperUser) role.
//  * 
//  * @param {Object} props
//  * @param {React.ReactNode} props.children - Content to show if user is owner
//  * @param {React.ReactNode} [props.fallback=null] - Optional content to show if user is NOT owner
//  * @param {boolean} [props.showLoading=false] - Whether to show nothing while loading role
//  */
// export const OwnerGuard = ({ children, fallback = null, showLoading = false }) => {
//     const { isSuperAdmin, loading } = useUserRole();

//     // If still loading role, we usually show nothing to avoid flicker
//     if (loading) return showLoading ? null : null;

//     // Return children if owner, otherwise the fallback
//     return isSuperAdmin ? children : fallback;
// };
