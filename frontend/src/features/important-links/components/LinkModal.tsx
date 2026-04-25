import React, { useState, useEffect } from 'react';
import type { ImportantLink, UpdateLinkDto } from '../types';
import styles from '../styles/ImportantLinks.module.css';
import { importantLinksApi } from '../api/importantLinksApi';
import Swal from 'sweetalert2';

interface LinkModalProps {
  link: ImportantLink | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({ link, isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = useState<UpdateLinkDto>({});

  useEffect(() => {
    if (link) {
      setFormData({
        title: link.title,
        is_available: link.is_available,
        is_multi_country: link.is_multi_country,
        url: link.url || '',
        urls: link.urls || {},
      });
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await importantLinksApi.updateLink(link.id, formData);
      Swal.fire('Success', 'Link updated successfully', 'success');
      onRefresh();
      onClose();
    } catch (error) {
      Swal.fire('Error', 'Failed to update link', 'error');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: '#1a1a1a', padding: '2rem', borderRadius: '16px',
        width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#fff' }}>Edit Link</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Title</label>
            <input 
              className={styles.searchBar} 
              style={{ maxWidth: '100%' }}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.is_available}
                onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
              /> Available
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.is_multi_country}
                onChange={(e) => setFormData({...formData, is_multi_country: e.target.checked})}
              /> Multi-country
            </label>
          </div>

          {!formData.is_multi_country ? (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>URL</label>
              <input 
                className={styles.searchBar} 
                style={{ maxWidth: '100%' }}
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
              />
            </div>
          ) : (
            <div>
               <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Country URLs (JSON Format)</label>
               <textarea 
                 className={styles.searchBar} 
                 style={{ maxWidth: '100%', height: '100px', fontFamily: 'monospace' }}
                 value={JSON.stringify(formData.urls, null, 2)}
                 onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, urls: parsed});
                    } catch(err) { /* invalid json while typing */ }
                 }}
               />
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className={styles.directLink} style={{ flex: 1, border: 'none', cursor: 'pointer' }}>
              Save Changes
            </button>
            <button 
              type="button" 
              onClick={onClose}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
