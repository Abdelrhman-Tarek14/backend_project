import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { ImportantLink, UpdateLinkDto } from '../types';
import styles from '../styles/LinkModal.module.css';
import { importantLinksApi } from '../api/importantLinksApi';
import Swal from 'sweetalert2';
import { BiSave, BiLinkAlt, BiCodeAlt } from 'react-icons/bi';

const DEFAULT_COUNTRY_URLS = {
  "uae": "https://",
  "oman": "https://",
  "egypt": "https://",
  "qatar": "https://",
  "jordan": "https://",
  "kuwait": "https://",
  "bahrain": "https://"
};

interface LinkModalProps {
  link: ImportantLink | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({ link, isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = useState<UpdateLinkDto>({});
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;

    setIsSaving(true);
    try {
      await importantLinksApi.updateLink(link.id, formData);
      Swal.fire({
        title: 'Success!',
        text: 'Link updated successfully',
        icon: 'success',
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#6366f1'
      });
      onRefresh();
      onClose();
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'Failed to update link',
        icon: 'error',
        background: '#1e293b',
        color: '#fff'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && link && (
        <div className={styles.overlay}>
          <m.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={styles.modalContent}
          >
            <h2 className={styles.modalTitle}>Edit Link</h2>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  className={styles.inputField}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter link title..."
                  required
                />
              </div>

              <div className={styles.checkboxRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.customCheckbox}
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  />
                  Available
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.customCheckbox}
                    checked={formData.is_multi_country}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      const updates: any = { is_multi_country: isChecked };

                      // If enabling multi-country and URLs are empty or just {}, pre-fill with template
                      if (isChecked && (!formData.urls || Object.keys(formData.urls).length === 0)) {
                        updates.urls = DEFAULT_COUNTRY_URLS;
                      }

                      setFormData({ ...formData, ...updates });
                    }}
                  />
                  Multi-country
                </label>
              </div>

              {!formData.is_multi_country ? (
                <div className={styles.formGroup}>
                  <label><BiLinkAlt /> Direct URL</label>
                  <input
                    className={styles.inputField}
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://docs.google.com/..."
                    required={!formData.is_multi_country}
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label><BiCodeAlt /> Country URLs (JSON)</label>
                  <textarea
                    className={`${styles.inputField} ${styles.textareaField}`}
                    value={JSON.stringify(formData.urls, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({ ...formData, urls: parsed });
                      } catch (err) { /* invalid json while typing */ }
                    }}
                    placeholder='{"EG": "https://...", "UAE": "https://..."}'
                  />
                </div>
              )}

              <div className={styles.modalFooter}>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={isSaving}
                >
                  <m.div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <BiSave size={20} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </m.div>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};

