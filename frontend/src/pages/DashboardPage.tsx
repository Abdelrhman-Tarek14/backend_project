// import { useState, useEffect, useMemo } from 'react';
// import { useAuth } from '../features/auth/hooks/useAuth';
// import { useUserRole } from '../hooks/useUserRole';
// import {
//     BiTimeFive, BiHash, BiCategory, BiTrophy, BiBarChartAlt2,
//     BiCheckShield, BiStar, BiTrendingUp, BiUserCircle, BiCheckCircle
// } from 'react-icons/bi';
// import { motion, AnimatePresence } from 'framer-motion';
// import { useCaseTimer } from '../features/timer/hooks/useCaseTimer';
// import { timerService } from '../features/timer/services/timerService';
// import { scoreService } from '../services/scoreService';
// import styles from './DashboardPage.module.css';

// // Typewriter Effect Component
// const Typewriter = ({ text }) => {
//     const [displayText, setDisplayText] = useState('');

//     useEffect(() => {
//         let i = 0;
//         const interval = setInterval(() => {
//             setDisplayText(text.slice(0, i));
//             i++;
//             if (i > text.length) clearInterval(interval);
//         }, 50);
//         return () => clearInterval(interval);
//     }, [text]);

//     return <span>{displayText}</span>;
// };

// // Circular KPI Component with Pill Style
// const KPIItem = ({ label, value, target, color, icon: Icon }) => {
//     const diff = value - target;
//     const isPositive = diff >= 0;
//     const radius = 32;
//     const circumference = 2 * Math.PI * radius;
//     const offset = circumference - (value / 100) * circumference;

//     return (
//         <motion.div
//             className={styles.kpiPill}
//             initial={{ opacity: 0, scale: 0.9 }}
//             animate={{ opacity: 1, scale: 1 }}
//             whileHover={{ y: -5 }}
//         >
//             <div className={styles.pillLeft}>
//                 <svg width="80" height="80" viewBox="0 0 80 80">
//                     <circle cx="40" cy="40" r={radius} className={styles.circleBg} />
//                     <motion.circle
//                         cx="40" cy="40" r={radius}
//                         className={styles.circleProgress}
//                         style={{
//                             strokeDasharray: circumference,
//                             stroke: color
//                         }}
//                         initial={{ strokeDashoffset: circumference }}
//                         animate={{ strokeDashoffset: offset }}
//                         transition={{ duration: 1.5, ease: "easeOut" }}
//                     />
//                 </svg>
//                 <div className={styles.pillValueInner}>{value}%</div>
//             </div>
//             <div className={styles.pillRight}>
//                 <span className={styles.pillLabel}>{label}</span>
//                 <div className={styles.pillTrendRow}>
//                     <div className={styles.pillTrendBadge} style={{ color: isPositive ? '#10b981' : '#f43f5e', backgroundColor: isPositive ? '#10b98115' : '#f43f5e15' }}>
//                         <BiTrendingUp style={{ transform: !isPositive ? 'rotate(180deg)' : 'none' }} />
//                         {isPositive ? '+' : ''}{diff.toFixed(1)}%
//                     </div>
//                 </div>
//             </div>
//         </motion.div>
//     );
// };

// // Sync Active Session with Pill Style
// const ActiveKPIItem = ({ activeCases }) => {
//     const primaryCase = activeCases[0];
//     const { timeLeft, formatTime, isExceeded, progress } = useCaseTimer(primaryCase || {});
//     const radius = 32;
//     const circumference = 2 * Math.PI * radius;
//     const offset = circumference - (progress / 100) * circumference;

//     return (
//         <motion.div
//             className={`${styles.kpiPill} ${primaryCase ? styles.activePill : ''}`}
//             initial={{ opacity: 0, scale: 0.9 }}
//             animate={{ opacity: 1, scale: 1 }}
//             whileHover={{ y: -5 }}
//         >
//             <div className={styles.pillLeft}>
//                 <svg width="80" height="80" viewBox="0 0 80 80">
//                     <circle cx="40" cy="40" r={radius} className={styles.circleBg} />
//                     <motion.circle
//                         cx="40" cy="40" r={radius}
//                         className={styles.circleProgress}
//                         style={{
//                             strokeDasharray: circumference,
//                             strokeDashoffset: offset,
//                             stroke: isExceeded ? '#f43f5e' : '#6366f1'
//                         }}
//                     />
//                 </svg>
//                 <div className={styles.pillIconInner}>
//                     <BiTimeFive size={22} color={isExceeded ? '#f43f5e' : '#6366f1'} />
//                 </div>
//             </div>
//             <div className={styles.pillRight}>
//                 {primaryCase ? (
//                     <>
//                         <span className={`${styles.pillValueLarge} ${isExceeded ? styles.overdueText : ''}`}>
//                             {formatTime(timeLeft)}
//                         </span>
//                         <div className={styles.pillStatusWrapper}>
//                             <span className={styles.pillStatusDot} />
//                             <span className={styles.pillLabelSmall}>#{primaryCase.case_number}</span>
//                         </div>
//                     </>
//                 ) : (
//                     <>
//                         <span className={styles.pillValueLarge}>Ready</span>
//                         <span className={styles.pillLabelSmall}>No active case</span>
//                     </>
//                 )}
//             </div>
//         </motion.div>
//     );
// };

// // Bar Chart Component
// const PerformanceChart = ({ data = [0, 0, 0, 0, 0, 0, 0] }) => {
//     const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

//     return (
//         <div className={styles.chartSection}>
//             <div className={styles.sectionHeader}>
//                 <h3>Weekly Performance</h3>
//                 <div className={styles.chartBadge}>Weekly</div>
//             </div>
//             <div className={styles.barChart}>
//                 {data.map((val, i) => (
//                     <div key={i} className={styles.barWrapper}>
//                         <div className={styles.barContainer}>
//                             <motion.div
//                                 className={styles.bar}
//                                 initial={{ height: 0 }}
//                                 animate={{ height: `${val}%` }}
//                                 transition={{ delay: i * 0.1, duration: 0.8 }}
//                             />
//                         </div>
//                         <span className={styles.barLabel}>{days[i]}</span>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// // Top Achievers Table
// const Leaderboard = ({ achievers = [], loading = false }) => {
//     const getRankInfo = (score) => {
//         if (score >= 95) return { label: 'Diamond', color: '#00E5FF' };
//         if (score >= 90) return { label: 'Platinum', color: '#E5E4E2' };
//         if (score >= 80) return { label: 'Gold', color: '#FFD700' };
//         return { label: 'Silver', color: '#C0C0C0' };
//     };

//     return (
//         <div className={styles.leaderboardSection}>
//             <div className={styles.sectionHeader}>
//                 <h3>Top Achievers</h3>
//                 <button className={styles.viewAllBtn}>View All</button>
//             </div>
//             <div className={styles.tableWrapper}>
//                 <table className={styles.table}>
//                     <thead>
//                         <tr>
//                             <th>Agent</th>
//                             <th>Rank</th>
//                             <th>Cases</th>
//                             <th>Score</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {loading ? (
//                             <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading leaderboard...</td></tr>
//                         ) : achievers.length === 0 ? (
//                             <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No data available</td></tr>
//                         ) : (
//                             achievers.map((a, i) => {
//                                 const score = Math.round((a.qualityScorePercentage + a.finalCheckScorePercentage + a.etaScorePercentage) / 3);
//                                 const { label, color } = getRankInfo(score);
//                                 return (
//                                     <tr key={a.userId || i}>
//                                         <td className={styles.agentCell}>
//                                             <div className={styles.avatar}>{a.name[0]}</div>
//                                             {a.name}
//                                         </td>
//                                         <td>
//                                             <span className={styles.rankBadgeSmall} style={{ backgroundColor: `${color}20`, color: color }}>
//                                                 {label}
//                                             </span>
//                                         </td>
//                                         <td>{a.totalCases}</td>
//                                         <td className={styles.scoreCell}>{score}%</td>
//                                     </tr>
//                                 );
//                             })
//                         )}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };

// const DashboardPage = () => {
//     const { user } = useAuth();
//     const { displayName } = useUserRole();
//     const [activeCases, setActiveCases] = useState([]);
//     const [recentCases, setRecentCases] = useState([]);
//     const [achievers, setAchievers] = useState([]);
//     const [loadingRecent, setLoadingRecent] = useState(true);
//     const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
//     const [stats, setStats] = useState({
//         qaScore: 0, finalCheck: 0, etaAccuracy: 0, casesCompleted: 0, successRate: 0, weeklyData: [0, 0, 0, 0, 0, 0, 0]
//     });

//     useEffect(() => {
//         if (!user?.email) return;

//         // Subscribe to active cases
//         const unsub = timerService.subscribeToActiveCases(user.email, (cases) => {
//             setActiveCases(cases);
//         });

//         // Fetch user's recent closed cases and metrics
//         const fetchUserData = async () => {
//             try {
//                 const cases = await timerService.getClosedCases(1, 5);
//                 setRecentCases(cases);

//                 const userStats = await scoreService.getUserStats(user.email);
//                 if (userStats) setStats(userStats);

//             } catch (err) {
//                 console.error("Failed to fetch user dashboard data", err);
//             } finally {
//                 setLoadingRecent(false);
//             }
//         };

//         const fetchLeaderboard = async () => {
//             try {
//                 const data = await scoreService.getLeaderboard();
//                 setAchievers(data.slice(0, 5)); // Show top 5
//             } catch (err) {
//                 console.error("Failed to fetch leaderboard", err);
//             } finally {
//                 setLoadingLeaderboard(false);
//             }
//         };

//         fetchUserData();
//         fetchLeaderboard();
//         return () => unsub();
//     }, [user?.email]);

//     return (
//         <div className={styles.dashboard}>
//             <header className={styles.header}>
//                 <div className={styles.greeting}>
//                     <h1>Hi, <Typewriter text={displayName || 'Agent'} />!</h1>
//                     <p>Ready to elevate your productivity and track your peak performance today.</p>
//                 </div>
//                 <div className={styles.headerActions}>
//                     <div className={styles.searchBar} id="tour-dashboard-search">
//                         <BiHash />
//                         <input type="text" placeholder="Search anything..." />
//                     </div>
//                 </div>
//             </header>

//             <div className={styles.kpiRow} id="tour-dashboard-kpis">
//                 <KPIItem label="QA Score (Est)" value={stats.qaScore} target={95} color="#5d87ff" icon={BiCheckShield} />
//                 <KPIItem label="Final Check" value={stats.finalCheck} target={90} color="#ff8a48" icon={BiStar} />
//                 <KPIItem label="ETA Accuracy" value={stats.etaAccuracy} target={80} color="#4caf50" icon={BiTimeFive} />
//                 <ActiveKPIItem activeCases={activeCases} />
//             </div>

//             <div className={styles.contentGrid}>
//                 <div className={styles.mainColumn} id="tour-dashboard-stats">
//                     <PerformanceChart data={stats.weeklyData} />
//                     <Leaderboard achievers={achievers} loading={loadingLeaderboard} />
//                 </div>

//                 <aside className={styles.sideColumn} id="tour-dashboard-history">
//                     <div className={styles.liveActivity}>
//                         <div className={styles.sectionHeader}>
//                             <h3>My Recent History</h3>
//                             <span className={styles.livePulser} />
//                         </div>
//                         <div className={styles.activityList}>
//                             {loadingRecent ? (
//                                 <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading history...</p>
//                             ) : recentCases.length === 0 ? (
//                                 <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No recent cases.</p>
//                             ) : (
//                                 recentCases.map((act, i) => (
//                                     <div key={act.assignmentId || act.id || i} className={styles.activityItem}>
//                                         <div className={styles.activityAvatar}>
//                                             <BiCheckCircle color="#10b981" />
//                                         </div>
//                                         <div className={styles.activityInfo}>
//                                             <p><strong>#{act.case_number}</strong> {act.case_type}</p>
//                                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                                                 <span>{act.closed_at || act.timestamp || 'Just now'}</span>
//                                                 <span style={{
//                                                     fontSize: '0.7rem',
//                                                     fontWeight: 'bold',
//                                                     color: act.completion_status === 'On-Time' ? '#10b981' : '#f59e0b',
//                                                     backgroundColor: act.completion_status === 'On-Time' ? '#10b98115' : '#f59e0b15',
//                                                     padding: '1px 6px',
//                                                     borderRadius: '4px'
//                                                 }}>
//                                                     {act.completion_status}
//                                                 </span>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 ))
//                             )}
//                         </div>
//                     </div>

//                     <div className={styles.ongoingWork} id="tour-dashboard-milestones">
//                         <div className={styles.sectionHeader}>
//                             <h3>Personal Milestones</h3>
//                         </div>

//                         <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
//                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
//                                 <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text-muted)' }}>Mothly Cases</span>
//                                 <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-primary)' }}>{stats.casesCompleted} Cases</span>
//                             </div>
//                             <div className={styles.progressBarBase} style={{ height: '8px' }}>
//                                 <div className={styles.progressBarFill} style={{ width: `${Math.min(100, (stats.casesCompleted / 200) * 100)}%`, borderRadius: '100px' }} />
//                             </div>
//                         </div>

//                         <div className={styles.pulseStats}>
//                             <div className={styles.pulseStatItem}>
//                                 <div className={styles.statIcon} style={{ background: 'rgba(93, 135, 255, 0.1)', color: '#5d87ff' }}>
//                                     <BiTrophy size={20} />
//                                 </div>
//                                 <div className={styles.statInfo}>
//                                     <span className={styles.statValue}>Platinum</span>
//                                     <span className={styles.statLabel}>Current Rank</span>
//                                 </div>
//                             </div>

//                             <div className={styles.pulseStatItem}>
//                                 <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
//                                     <BiTrendingUp size={20} />
//                                 </div>
//                                 <div className={styles.statInfo}>
//                                     <span className={styles.statValue}>{stats.successRate || 0}%</span>
//                                     <span className={styles.statLabel}>Success Rate</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {activeCases.length > 0 && (
//                             <div className={styles.activeCasesSection} style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
//                                 <h4 style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>ACTIVE SESSION</h4>
//                                 {activeCases.map(c => (
//                                     <div key={c.assignmentId || c.id} className={styles.miniCaseCard} style={{ margin: 0 }}>
//                                         <div className={styles.caseHeader}>
//                                             <span className={styles.caseNum}>#{c.case_number}</span>
//                                             <span className={styles.caseType}>{c.case_type}</span>
//                                         </div>
//                                         <div className={styles.progressBarBase}>
//                                             <div className={styles.progressBarFill} style={{ width: '65%' }} />
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                 </aside>
//             </div>
//         </div>
//     );
// };

// export default DashboardPage;
