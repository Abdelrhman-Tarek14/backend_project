// import { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
// import { copyToClipboard } from '../../utils/clipboard';

// const itemVariants = {
//     hidden: { opacity: 0, y: 30 },
//     visible: {
//         opacity: 1,
//         y: 0,
//         transition: { type: "spring", stiffness: 100, damping: 15 }
//     }
// };

// const SourceAccordion = ({ title, items, icon, accentColor, children }) => {
//     const [isOpen, setIsOpen] = useState(false);
//     const [copiedIdx, setCopiedIdx] = useState(null);

//     const handleCopyItem = (text, idx) => {
//         copyToClipboard(text).then((success) => {
//             if (success) {
//                 setCopiedIdx(idx);
//                 setTimeout(() => setCopiedIdx(null), 1500);
//             }
//         });
//     };

//     return (
//         <motion.div
//             variants={itemVariants}
//             style={{
//                 backgroundColor: 'var(--color-bg-white)',
//                 borderRadius: '12px',
//                 marginBottom: '1rem',
//                 boxShadow: 'var(--shadow-sm)',
//                 overflow: 'hidden',
//                 border: `1px solid ${isOpen ? 'var(--color-primary)33' : 'transparent'}`,
//                 transition: 'all 0.3s ease'
//             }}
//         >
//             <button
//                 onClick={() => setIsOpen(!isOpen)}
//                 style={{
//                     width: '100%',
//                     padding: '1rem 1.5rem',
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     background: isOpen ? 'linear-gradient(135deg, #FF5722 0%, #F4511E 100%)' : 'var(--color-bg-white)',
//                     border: 'none',
//                     cursor: 'pointer',
//                     color: isOpen ? 'white' : 'var(--color-text-main)',
//                     transition: 'all 0.3s ease'
//                 }}
//             >
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                     {icon && <div style={{ color: isOpen ? 'white' : accentColor, display: 'flex' }}>{icon}</div>}
//                     <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
//                     <span style={{
//                         backgroundColor: isOpen ? 'rgba(255,255,255,0.2)' : accentColor + '22',
//                         color: isOpen ? 'white' : accentColor,
//                         padding: '2px 8px',
//                         borderRadius: '12px',
//                         fontSize: '0.8rem',
//                         fontWeight: '800',
//                         minWidth: '35px',
//                         textAlign: 'center'
//                     }}>
//                         {children ? 'View' : (items?.length || 0)}
//                     </span>
//                 </div>
//                 {isOpen ? <BiChevronUp size={24} /> : <BiChevronDown size={24} />}
//             </button>

//             <AnimatePresence>
//                 {isOpen && (
//                     <motion.div
//                         initial={{ height: 0, opacity: 0 }}
//                         animate={{ height: 'auto', opacity: 1 }}
//                         exit={{ height: 0, opacity: 0 }}
//                         transition={{ duration: 0.3, ease: 'easeInOut' }}
//                         style={{ overflow: 'hidden' }}
//                     >
//                         <div style={{
//                             padding: '1.5rem',
//                             maxHeight: '400px',
//                             overflowY: 'auto',
//                             display: 'grid',
//                             gridTemplateColumns: children ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
//                             gap: '12px',
//                             backgroundColor: 'var(--color-bg-light)'
//                         }}>
//                             {children ? children : (
//                                 items && items.length > 0 ? (
//                                     items.map((item, idx) => (
//                                         <div
//                                             key={idx}
//                                             style={{
//                                                 backgroundColor: 'var(--color-bg-white)',
//                                                 borderRadius: '8px',
//                                                 display: 'flex',
//                                                 flexDirection: 'column',
//                                                 borderLeft: `3px solid ${accentColor}`,
//                                                 boxShadow: 'var(--shadow-sm)',
//                                                 position: 'relative',
//                                                 overflow: 'hidden'
//                                             }}
//                                         >
//                                             <div
//                                                 onClick={() => handleCopyItem(item.en, idx + '_en')}
//                                                 style={{ padding: '8px 12px', cursor: 'pointer', transition: 'background 0.2s' }}
//                                                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 87, 34, 0.08)'}
//                                                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
//                                             >
//                                                 <div style={{ fontWeight: 800, fontSize: '0.9rem', color: copiedIdx === idx + '_en' ? accentColor : 'var(--color-text-main)' }}>{item.en}</div>
//                                             </div>
//                                             <div
//                                                 onClick={() => handleCopyItem(item.ar, idx + '_ar')}
//                                                 style={{ padding: '8px 12px', cursor: 'pointer', transition: 'background 0.2s', borderTop: '1px solid var(--color-border)' }}
//                                                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 87, 34, 0.08)'}
//                                                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
//                                             >
//                                                 <div style={{ fontSize: '0.85rem', color: copiedIdx === idx + '_ar' ? accentColor : 'var(--color-text-muted)', fontWeight: 600 }}>{item.ar}</div>
//                                             </div>

//                                             <AnimatePresence>
//                                                 {copiedIdx && String(copiedIdx).startsWith(idx) && (
//                                                     <motion.span
//                                                         initial={{ opacity: 0, scale: 0.8 }}
//                                                         animate={{ opacity: 1, scale: 1 }}
//                                                         exit={{ opacity: 0 }}
//                                                         style={{
//                                                             position: 'absolute',
//                                                             top: '4px',
//                                                             right: '8px',
//                                                             fontSize: '0.62rem',
//                                                             color: accentColor,
//                                                             fontWeight: 'bold',
//                                                             background: 'var(--color-bg-white)',
//                                                             padding: '1px 4px',
//                                                             borderRadius: '3px',
//                                                             pointerEvents: 'none',
//                                                             border: `1px solid ${accentColor}44`
//                                                         }}
//                                                     >
//                                                         Copied!
//                                                     </motion.span>
//                                                 )}
//                                             </AnimatePresence>
//                                         </div>
//                                     ))
//                                 ) : (
//                                     <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
//                                         No items found in this category.
//                                     </div>
//                                 )
//                             )}
//                         </div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </motion.div>
//     );
// };


// export default SourceAccordion;