import React, { useState } from 'react';
import { useImportantLinks } from '../features/important-links/hooks/useImportantLinks';
import { LinksGroup } from '../features/important-links/components/LinksGroup';
import styles from '../features/important-links/styles/ImportantLinks.module.css';
import { SiGooglesheets, SiGoogledrive } from 'react-icons/si';
import { FaWpforms, FaGlobe } from 'react-icons/fa';
import { BiSearch, BiRefresh } from 'react-icons/bi';
import { FiMinusSquare, FiPlusSquare } from 'react-icons/fi';

const ImportantLinksPage: React.FC = () => {
  const { data, loading, error, refetch } = useImportantLinks();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    // Small delay to make the animation feel smooth
    setTimeout(() => setIsRefreshing(false), 600);
  };

  if (loading && !isRefreshing) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Important Links</h1>
          <p>Loading your resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 style={{ color: '#ef4444' }}>Error</h1>
          <p>{error}</p>
          <button onClick={() => refetch()} className={styles.refreshBtnInline}>Try Again</button>
        </div>
      </div>
    );
  }

  const resources = data?.resources;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Important Links</h1>
        <p>Access all tools and resources in one place</p>
      </header>

      {/* Search and Global Actions */}
      <div className={styles.actionsBar}>
        <div className={styles.searchWrapper}>
          <BiSearch />
          <input 
            type="text" 
            placeholder="Search for a specific link or tool..." 
            className={styles.publicSearch}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.globalActions}>
          <button 
            className={styles.refreshIconBtn}
            onClick={handleRefresh}
            title="Refresh links"
            disabled={isRefreshing}
          >
            <BiRefresh className={isRefreshing ? styles.spinIcon : ''} />
          </button>

          <button 
            className={styles.collapseAllBtn}
            onClick={() => setIsAllCollapsed(!isAllCollapsed)}
          >
            {isAllCollapsed ? (
              <><FiPlusSquare /> Expand All</>
            ) : (
              <><FiMinusSquare /> Collapse All</>
            )}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {resources?.forms && (
          <LinksGroup 
            title="Forms" 
            links={resources.forms} 
            icon={FaWpforms} 
            color="#818cf8" 
            searchTerm={searchTerm}
            isAllCollapsed={isAllCollapsed}
          />
        )}

        {resources?.sheets && (
          <LinksGroup 
            title="Sheets" 
            links={resources.sheets} 
            icon={SiGooglesheets} 
            color="#10b981" 
            searchTerm={searchTerm}
            isAllCollapsed={isAllCollapsed}
          />
        )}

        {resources?.websites && (
          <LinksGroup 
            title="Websites" 
            links={resources.websites} 
            icon={FaGlobe} 
            color="#3b82f6" 
            searchTerm={searchTerm}
            isAllCollapsed={isAllCollapsed}
          />
        )}

        {resources?.drive && (
          <LinksGroup 
            title="Google Drive" 
            links={resources.drive} 
            icon={SiGoogledrive} 
            color="#f59e0b" 
            searchTerm={searchTerm}
            isAllCollapsed={isAllCollapsed}
          />
        )}
      </div>
    </div>
  );
};

export default ImportantLinksPage;
