import React from 'react';
import type { ImportantLink } from '../types';
import styles from '../styles/ImportantLinks.module.css';
import { FiExternalLink, FiGlobe } from 'react-icons/fi';

interface LinkCardProps {
  link: ImportantLink;
  categoryColor: string;
}

export const LinkCard: React.FC<LinkCardProps> = ({ link, categoryColor }) => {
  if (!link.is_available) return null;

  const countryCount = link.is_multi_country && link.urls ? Object.keys(link.urls).length : 0;

  return (
    <div 
      className={styles.card} 
      style={{ '--category-color': categoryColor } as React.CSSProperties}
    >
      <h3 className={`${styles.cardTitle} ${link.is_multi_country ? styles.cardTitleHiddenOnHover : ''}`}>
        {link.title}
      </h3>
      
      {link.is_multi_country && link.urls ? (
        <div className={styles.multiCountryContainer}>
          <div className={styles.defaultInfo}>
            <FiGlobe /> {countryCount} Countries
          </div>
          
          <div className={styles.countrySquares}>
            {Object.entries(link.urls).map(([country, url]) => (
              <a 
                key={country}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.countrySquare}
                title={country.toUpperCase()}
              >
                {country.substring(0, 2).toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <a 
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.directLink}
        >
          <FiExternalLink /> Open Link
        </a>
      )}
    </div>
  );
};
