import React, { useEffect, useState, useMemo } from 'react';
import { BiSearch, BiChevronLeft, BiChevronRight, BiRefresh } from 'react-icons/bi';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { usersApi } from '../../../api/usersApi';
import type { User, UserRole } from '../../../api/usersApi';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { ROLES } from '../../../constants/roles';
import styles from './UsersManagementPage.module.css';

const MySwal = withReactContent(Swal);

const UsersManagementPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);

    const isMe = (userId: string | number) => currentUser?.id?.toString() === userId.toString();

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await usersApi.getUsers({ page, limit });
            // Handle both array response and paginated response
            const resData = response.data as any;
            if (Array.isArray(resData)) {
                setUsers(resData);
                setTotal(resData.length);
            } else if (resData && resData.data) {
                setUsers(resData.data);
                setTotal(resData.meta.totalCount || resData.data.length);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load users list.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const term = searchTerm.toLowerCase();
        return users.filter(user => 
            user.name.toLowerCase().includes(term) || 
            user.email.toLowerCase().includes(term)
        );
    }, [users, searchTerm]);

    const handleUpdateStatus = async (userId: string | number, updates: { role?: UserRole; isActive?: boolean }) => {
        try {
            const result = await MySwal.fire({
                title: 'Are you sure?',
                text: `You are about to update this user's ${updates.role ? 'role' : 'status'}.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: 'var(--color-primary)',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, update it!'
            });

            if (result.isConfirmed) {
                await usersApi.updateUserStatus(userId, updates);
                
                // Update local state
                setUsers(prev => prev.map(u => 
                    u.id === userId ? { ...u, ...updates } : u
                ));

                MySwal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'User status has been updated successfully.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                // Refresh list to revert UI state if toggle was cancelled
                fetchUsers();
            }
        } catch (error: any) {
            console.error('Failed to update user:', error);
            MySwal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error.response?.data?.message || 'Failed to update user status.'
            });
            fetchUsers(); // Revert UI
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>User Management</h1>
                    <p>Manage user roles and system access permissions</p>
                </div>
                <button className={styles.pageBtn} onClick={fetchUsers} disabled={loading}>
                    <BiRefresh size={20} />
                </button>
            </header>

            <div className={styles.controls}>
                <div className={styles.searchBox}>
                    <BiSearch className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableCard}>
                {loading ? (
                    <div className={styles.loadingOverlay}>
                        <p>Loading users...</p>
                    </div>
                ) : filteredUsers.length > 0 ? (
                    <div className={styles.tableWrapper}>
                        <table className={styles.userTable}>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className={styles.userInfo}>
                                                <div className={styles.avatar}>
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className={styles.userDetails}>
                                                    <span className={styles.userName}>{user.name}</span>
                                                    <span className={styles.userEmail}>{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <select 
                                                className={styles.roleSelect}
                                                value={user.role}
                                                onChange={(e) => handleUpdateStatus(user.id, { role: e.target.value as UserRole })}
                                                disabled={isMe(user.id)}
                                                title={isMe(user.id) ? "You cannot change your own role" : ""}
                                            >
                                                {Object.values(ROLES).map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <label 
                                                className={styles.statusToggle}
                                                title={isMe(user.id) ? "You cannot disable your own account" : ""}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={user.isActive !== false} 
                                                    onChange={(e) => handleUpdateStatus(user.id, { isActive: e.target.checked })}
                                                    disabled={isMe(user.id)}
                                                />
                                                <span className={`${styles.slider} ${isMe(user.id) ? styles.disabledSlider : ''}`}></span>
                                            </label>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>No users found matching your search.</p>
                    </div>
                )}

                <div className={styles.pagination}>
                    <div className={styles.pageInfo}>
                        Showing {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} of {total} users
                    </div>
                    <div className={styles.pageActions}>
                        <button 
                            className={styles.pageBtn} 
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <BiChevronLeft size={20} />
                        </button>
                        <button 
                            className={styles.pageBtn} 
                            disabled={page * limit >= total || loading}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <BiChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersManagementPage;
