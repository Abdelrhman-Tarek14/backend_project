import React, { useState, useEffect } from 'react';
import type { ImportantLink } from '../types';
import { LinkCard } from './LinkCard';
import styles from '../styles/ImportantLinks.module.css';
import type { IconType } from 'react-icons';
import { FiChevronDown } from 'react-icons/fi';

interface LinksGroupProps {
  title: string;
  links: Record<string, ImportantLink>;
  icon: IconType;
  color: string;
  searchTerm: string;
  isAllCollapsed: boolean;
}

export const LinksGroup: React.FC<LinksGroupProps> = ({ 
  title, 
  links, 
  icon: Icon, 
  color,
  searchTerm,
  isAllCollapsed
}) => {
  const [isLocalCollapsed, setIsLocalCollapsed] = useState(false);

  // Sync local state with global "Collapse All"
  useEffect(() => {
    setIsLocalCollapsed(isAllCollapsed);
  }, [isAllCollapsed]);

  // Filter links based on availability AND search term
  const linkList = Object.values(links).filter(link => {
    const isAvailable = link.is_available;
    const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase());
    return isAvailable && matchesSearch;
  });
  
  if (linkList.length === 0) return null;

  return (
    <div className={`${styles.categorySection} ${isLocalCollapsed ? styles.collapsed : ''}`}>
      <div 
        className={styles.categoryTitle} 
        style={{ color }}
        onClick={() => setIsLocalCollapsed(!isLocalCollapsed)}
      >
        <div className={styles.categoryTitleLeft}>
          <Icon /> {title} 
          <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '10px', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
            {linkList.length}
          </span>
        </div>
        <FiChevronDown className={styles.collapseIcon} />
      </div>
      
      <div className={`${styles.collapsibleContent} ${isLocalCollapsed ? styles.contentCollapsed : ''}`}>
        <div className={styles.linksGrid}>
          {linkList.map((link) => (
            <LinkCard 
              key={link.id || link.key} 
              link={link} 
              categoryColor={color} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};
