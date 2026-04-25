import React, { useState, useRef, useEffect } from 'react';
import type { ImportantLink, ImportantLinkResources } from '../types';
import styles from '../styles/ImportantLinks.module.css';
import { 
  BiSearch, 
  BiTrash, 
  BiEdit, 
  BiCloudDownload, 
  BiReset, 
  BiChevronLeft, 
  BiChevronRight,
  BiChevronDown,
  BiCheck
} from 'react-icons/bi';
import { importantLinksApi } from '../api/importantLinksApi';
import Swal from 'sweetalert2';

interface AdminLinksTableProps {
  data: ImportantLinkResources | null;
  onRefresh: () => void;
  onEdit: (link: ImportantLink) => void;
  onImport: () => void;
}

export const AdminLinksTable: React.FC<AdminLinksTableProps> = ({ data, onRefresh, onEdit, onImport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters State
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Dropdowns Open/Close State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (categoryRef.current && !categoryRef.current.contains(event.target as Node)) &&
        (statusRef.current && !statusRef.current.contains(event.target as Node)) &&
        (typeRef.current && !typeRef.current.contains(event.target as Node)) &&
        (paginationRef.current && !paginationRef.current.contains(event.target as Node))
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allLinks: ImportantLink[] = data ? [
    ...Object.values(data.resources.forms || {}),
    ...Object.values(data.resources.sheets || {}),
    ...Object.values(data.resources.websites || {}),
    ...Object.values(data.resources.drive || {}),
  ] as ImportantLink[] : [];

  const filteredLinks = allLinks.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilters.length === 0 || categoryFilters.includes(link.category);
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'AVAILABLE' ? link.is_available : !link.is_available);
    const matchesType = typeFilter === 'ALL' || 
                       (typeFilter === 'MULTI' ? link.is_multi_country : !link.is_multi_country);
    
    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  });

  const totalItems = filteredLinks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLinks.slice(indexOfFirstItem, indexOfLastItem);

  const handleReset = () => {
    setSearchTerm('');
    setCategoryFilters([]);
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setCurrentPage(1);
  };

  const handleCategoryToggle = (category: string) => {
    setCategoryFilters(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
    setCurrentPage(1);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Link?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      background: '#1a1a1a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await importantLinksApi.deleteLink(id);
        Swal.fire('Deleted!', 'Link has been deleted.', 'success');
        onRefresh();
      } catch (error) {
        Swal.fire('Error', 'Failed to delete link', 'error');
      }
    }
  };

  const selectContainerStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    padding: '8px 12px',
    cursor: 'pointer',
    outline: 'none',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s'
  };

  const dropdownMenuStyle = (isOpenUpwards = false): React.CSSProperties => ({
    position: 'absolute',
    [isOpenUpwards ? 'bottom' : 'top']: '110%',
    left: 0,
    width: '100%',
    background: '#1a1f2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    zIndex: 100,
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    padding: '8px',
    maxHeight: '300px',
    overflowY: 'auto'
  });

  const dropdownItemStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: '6px',
    background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    color: isSelected ? '#3b82f6' : '#ccc',
    marginBottom: '2px',
    cursor: 'pointer'
  });

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader} style={{ marginBottom: '2.5rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
          <BiSearch style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '1.2rem', zIndex: 1 }} />
          <input 
            type="text" 
            placeholder="Search links by title..." 
            className={styles.adminSearchBar}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={styles.pill}
            style={{ height: '48px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}
            onClick={handleReset}
          >
            <BiReset fontSize="1.2rem" /> Reset Filters
          </button>
          <button 
            className={styles.directLink} 
            style={{ height: '48px', background: '#10b981', color: '#fff', padding: '0 1.5rem', border: 'none', cursor: 'pointer', borderRadius: '10px', fontWeight: 600 }}
            onClick={onImport}
          >
            <BiCloudDownload fontSize="1.2rem" /> Import JSON
          </button>
        </div>
      </div>

      <table className={styles.adminTable}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ width: '60px', padding: '1.5rem 1rem' }}>
              <input 
                type="checkbox" 
                className={styles.customCheckbox}
                onChange={handleSelectAll}
                checked={selectedIds.length === currentItems.length && currentItems.length > 0}
              />
            </th>
            <th style={{ minWidth: '250px' }}>Title</th>
            <th style={{ width: '220px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} ref={categoryRef}>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</span>
                <div style={{ position: 'relative' }}>
                  <div 
                    style={selectContainerStyle} 
                    onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {categoryFilters.length === 0 ? 'All Categories' : `${categoryFilters.length} Selected`}
                    </span>
                    <BiChevronDown style={{ transform: openDropdown === 'category' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </div>
                  
                  {openDropdown === 'category' && (
                    <div style={dropdownMenuStyle()}>
                      {['FORMS', 'SHEETS', 'WEBSITES', 'DRIVE'].map(cat => (
                        <div 
                          key={cat}
                          onClick={() => handleCategoryToggle(cat)}
                          style={dropdownItemStyle(categoryFilters.includes(cat))}
                        >
                          <span style={{ fontSize: '0.85rem' }}>{cat}</span>
                          {categoryFilters.includes(cat) && <BiCheck />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </th>
            <th style={{ width: '180px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} ref={statusRef}>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                <div style={{ position: 'relative' }}>
                  <div 
                    style={selectContainerStyle} 
                    onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                  >
                    <span>{statusFilter === 'ALL' ? 'All Status' : statusFilter === 'AVAILABLE' ? 'Available' : 'Unavailable'}</span>
                    <BiChevronDown style={{ transform: openDropdown === 'status' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </div>
                  
                  {openDropdown === 'status' && (
                    <div style={dropdownMenuStyle()}>
                      {['ALL', 'AVAILABLE', 'UNAVAILABLE'].map(status => (
                        <div 
                          key={status}
                          onClick={() => { setStatusFilter(status); setOpenDropdown(null); setCurrentPage(1); }}
                          style={dropdownItemStyle(statusFilter === status)}
                        >
                          <span style={{ fontSize: '0.85rem' }}>{status === 'ALL' ? 'All Status' : status}</span>
                          {statusFilter === status && <BiCheck />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </th>
            <th style={{ width: '180px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} ref={typeRef}>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</span>
                <div style={{ position: 'relative' }}>
                  <div 
                    style={selectContainerStyle} 
                    onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                  >
                    <span>{typeFilter === 'ALL' ? 'All Types' : typeFilter === 'MULTI' ? 'Multi-country' : 'Single'}</span>
                    <BiChevronDown style={{ transform: openDropdown === 'type' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </div>
                  
                  {openDropdown === 'type' && (
                    <div style={dropdownMenuStyle()}>
                      {['ALL', 'SINGLE', 'MULTI'].map(type => (
                        <div 
                          key={type}
                          onClick={() => { setTypeFilter(type); setOpenDropdown(null); setCurrentPage(1); }}
                          style={dropdownItemStyle(typeFilter === type)}
                        >
                          <span style={{ fontSize: '0.85rem' }}>{type === 'ALL' ? 'All Types' : type === 'MULTI' ? 'Multi-country' : 'Single'}</span>
                          {typeFilter === type && <BiCheck />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </th>
            <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map(link => (
            <tr key={link.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '1.2rem 1rem' }}>
                <input 
                  type="checkbox" 
                  className={styles.customCheckbox}
                  checked={selectedIds.includes(link.id)}
                  onChange={() => handleSelectOne(link.id)}
                />
              </td>
              <td style={{ fontWeight: 600, fontSize: '0.95rem' }}>{link.title}</td>
              <td>
                <span className={styles.badge} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {link.category}
                </span>
              </td>
              <td>
                <span className={`${styles.badge} ${link.is_available ? styles.badgeAvailable : styles.badgeUnavailable}`} style={{ padding: '4px 12px' }}>
                  {link.is_available ? 'Available' : 'Unavailable'}
                </span>
              </td>
              <td>
                <span className={styles.badge} style={{ background: link.is_multi_country ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.02)', color: link.is_multi_country ? '#818cf8' : '#888' }}>
                  {link.is_multi_country ? 'Multi-country' : 'Single'}
                </span>
              </td>
              <td style={{ textAlign: 'right', paddingRight: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button className={styles.pill} onClick={() => onEdit(link)} style={{ width: '36px', height: '36px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><BiEdit fontSize="1.1rem" /></button>
                  <button className={styles.pill} onClick={() => handleDelete(link.id)} style={{ width: '36px', height: '36px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ef4444' }}><BiTrash fontSize="1.1rem" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '2.5rem', 
        padding: '1.5rem 1rem', 
        borderTop: '1px solid rgba(255,255,255,0.05)',
        color: '#888', 
        fontSize: '0.9rem' 
      }}>
        <div>
          Showing <span style={{ color: '#fff', fontWeight: 600 }}>{indexOfFirstItem + 1}</span> to <span style={{ color: '#fff', fontWeight: 600 }}>{Math.min(indexOfLastItem, totalItems)}</span> of <span style={{ color: '#fff', fontWeight: 600 }}>{totalItems}</span> entries
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} ref={paginationRef}>
            <span style={{ fontSize: '0.8rem' }}>Show:</span>
            <div style={{ position: 'relative', width: '80px' }}>
              <div 
                style={{ ...selectContainerStyle, padding: '4px 10px' }} 
                onClick={() => setOpenDropdown(openDropdown === 'pagination' ? null : 'pagination')}
              >
                <span>{itemsPerPage}</span>
                <BiChevronDown style={{ transform: openDropdown === 'pagination' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </div>
              
              {openDropdown === 'pagination' && (
                <div style={dropdownMenuStyle(true)}>
                  {[5, 10, 20, 50].map(size => (
                    <div 
                      key={size}
                      onClick={() => { setItemsPerPage(size); setOpenDropdown(null); setCurrentPage(1); }}
                      style={dropdownItemStyle(itemsPerPage === size)}
                    >
                      <span style={{ fontSize: '0.85rem' }}>{size}</span>
                      {itemsPerPage === size && <BiCheck />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ ...selectContainerStyle, padding: '8px', width: 'auto', opacity: currentPage === 1 ? 0.3 : 1 }}
            >
              <BiChevronLeft size={20} />
            </button>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 15px', borderRadius: '6px', color: '#fff', fontWeight: 600 }}>
              {currentPage} / {totalPages || 1}
            </div>
            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => p + 1)}
              style={{ ...selectContainerStyle, padding: '8px', width: 'auto', opacity: (currentPage === totalPages || totalPages === 0) ? 0.3 : 1 }}
            >
              <BiChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
