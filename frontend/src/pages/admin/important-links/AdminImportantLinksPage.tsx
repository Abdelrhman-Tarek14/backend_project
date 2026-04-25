import React, { useState } from 'react';
import { useImportantLinks } from '../../../features/important-links/hooks/useImportantLinks';
import { AdminLinksTable } from '../../../features/important-links/components/AdminLinksTable';
import { LinkModal } from '../../../features/important-links/components/LinkModal';
import type { ImportantLink } from '../../../features/important-links/types';
import styles from '../../../features/important-links/styles/ImportantLinks.module.css';
import { importantLinksApi } from '../../../features/important-links/api/importantLinksApi';
import Swal from 'sweetalert2';

import { BiPlus } from 'react-icons/bi';

const AdminImportantLinksPage: React.FC = () => {
  const { data, loading, error, refetch } = useImportantLinks();
  const [isImporting, setIsImporting] = useState(false);
  const [editingLink, setEditingLink] = useState<ImportantLink | null>(null);

  const handleCreate = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Create New Link',
      html: `
        <div style="display: flex; flex-direction: column; gap: 15px; text-align: left; padding: 10px;">
          <div>
            <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">Title</label>
            <input id="swal-title" class="swal2-input" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">Unique Key (e.g. attendance_form)</label>
            <input id="swal-key" class="swal2-input" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">Category</label>
            <select id="swal-category" class="swal2-input" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
              <option value="FORMS">Forms</option>
              <option value="SHEETS">Sheets</option>
              <option value="WEBSITES">Websites</option>
              <option value="DRIVE">Drive</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">URL</label>
            <input id="swal-url" class="swal2-input" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;" placeholder="https://...">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Link',
      preConfirm: () => {
        return {
          title: (document.getElementById('swal-title') as HTMLInputElement).value,
          key: (document.getElementById('swal-key') as HTMLInputElement).value,
          category: (document.getElementById('swal-category') as HTMLSelectElement).value,
          url: (document.getElementById('swal-url') as HTMLInputElement).value,
          is_available: true,
          is_multi_country: false // Default to single
        }
      }
    });

    if (formValues) {
      if (!formValues.title || !formValues.key || !formValues.url) {
        return Swal.fire('Error', 'Please fill all basic fields', 'error');
      }
      try {
        await importantLinksApi.createLink(formValues);
        Swal.fire('Created!', 'The link has been added.', 'success');
        refetch();
      } catch (err) {
        Swal.fire('Error', 'Failed to create link', 'error');
      }
    }
  };

  const handleImport = async () => {
    // ... (rest of the function stays same)
    const { value: jsonText } = await Swal.fire({
      title: 'Import Links from JSON',
      input: 'textarea',
      inputLabel: 'Paste the content of important links.json',
      inputPlaceholder: 'Paste JSON here...',
      inputAttributes: {
        'aria-label': 'Paste JSON here'
      },
      showCancelButton: true,
      confirmButtonText: 'Start Import'
    });

    if (jsonText) {
      try {
        setIsImporting(true);
        const jsonData = JSON.parse(jsonText);
        await importantLinksApi.importLinks(jsonData);
        Swal.fire('Success!', 'Data imported successfully.', 'success');
        refetch();
      } catch (err) {
        Swal.fire('Error', 'Invalid JSON format or server error', 'error');
      } finally {
        setIsImporting(false);
      }
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ textAlign: 'left', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Manage Important Links</h1>
          <p>Control what links appear to employees and update their availability.</p>
        </div>
        <button 
          className={styles.directLink} 
          style={{ background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', padding: '0.8rem 1.5rem' }}
          onClick={handleCreate}
        >
          <BiPlus /> Create New Link
        </button>
      </header>

      {loading && !isImporting ? (
        <p>Loading administration panel...</p>
      ) : error ? (
        <p style={{ color: '#ef4444' }}>{error}</p>
      ) : (
        <AdminLinksTable 
          data={data} 
          onRefresh={refetch}
          onEdit={(link) => setEditingLink(link)}
          onImport={handleImport}
        />
      )}

      <LinkModal 
        link={editingLink} 
        isOpen={!!editingLink} 
        onClose={() => setEditingLink(null)} 
        onRefresh={refetch}
      />

      {/* Button to trigger import manually if table is empty or for update */}
      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h3>No links found in database.</h3>
          <button 
            className={styles.directLink} 
            style={{ background: '#3b82f6', color: '#fff', border: 'none', marginTop: '1rem', cursor: 'pointer' }}
            onClick={handleImport}
          >
            Seed Database from JSON
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminImportantLinksPage;
