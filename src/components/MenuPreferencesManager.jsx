import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Image as ImageIcon,
  Smile,
  Upload,
  Eye,
  Check,
  X,
  Info,
  GripVertical,
  Filter,
  RefreshCw,
  Minus,
  ChevronDown,
  Shield,
  Flame,
  Home,
  ChevronRight,
  ArrowUpDown,
  MoreVertical,
  Tv
} from 'lucide-react';
import {
  getAllergens,
  getFlavorPreferences,
  saveAllergens,
  saveFlavorPreferences,
  apiAddAllergen,
  apiUpdateAllergen,
  apiDeleteAllergen,
  apiAddFlavor,
  apiUpdateFlavor,
  apiDeleteFlavor,
  apiReorderPreferences,
  resetPreferencesToDefault,
  subscribePreferences
} from '../utils/preferencesService';
import CulinaryIconPicker from './CulinaryIconPicker';

// Comprehensive presets for quick-pick emoji selection (matching Image 2)
const ALLERGEN_EMOJI_PRESETS = [
  '🥜', '🌾', '🥛', '🫘', '🥚', '🦐', '🐟', '🌰', '🌱', '🌽', '🦀', '🥩', '🧅', '🧁', '🧄', '🍞', '🧀'
];
const FLAVOR_EMOJI_PRESETS = [
  '🔥', '🌿', '🍬', '🍴', '💚', '🍓', '🍫', '🧂', '🍋', '🥑', '🌶️', '🍵', '🍄', '🍜', '🍱', '🥣', '🥢'
];

export default function MenuPreferencesManager({ socket, onLogActivity }) {
  const [allergens, setAllergens] = useState(() => getAllergens());
  const [flavors, setFlavors] = useState(() => getFlavorPreferences());
  const [activeTab, setActiveTab] = useState('allergens'); // 'allergens' | 'flavors'

  // Search, Filter, Sort and Action Menu state
  const [allergenSearch, setAllergenSearch] = useState('');
  const [allergenFilter, setAllergenFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [flavorSearch, setFlavorSearch] = useState('');
  const [flavorFilter, setFlavorFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [sortOrder, setSortOrder] = useState('order-asc'); // 'order-asc' | 'order-desc' | 'name-asc' | 'name-desc'
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // Toast message state
  const [toastMessage, setToastMessage] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('allergen'); // 'allergen' | 'flavor'
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingItem, setEditingItem] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIconType, setFormIconType] = useState('emoji'); // 'emoji' | 'image'
  const [formEmoji, setFormEmoji] = useState('🥜');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStatus, setFormStatus] = useState('Active'); // 'Active' | 'Inactive'
  const [formOrder, setFormOrder] = useState(1);
  const [formError, setFormError] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'uploading' | 'complete' | 'failed'

  // Delete Confirmation State
  const [deleteDialogItem, setDeleteDialogItem] = useState(null);

  // Drag and Drop ordering state
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  const fileInputRef = useRef(null);

  // Helper to log audit activity
  const logAction = (action, details) => {
    if (typeof onLogActivity === 'function') {
      onLogActivity(action, details);
    }
  };

  // Show Toast
  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Subscribe to real-time sync from backend or other tabs
  useEffect(() => {
    const unsubscribe = subscribePreferences(({ allergens: newAllergens, flavors: newFlavors }) => {
      if (newAllergens) setAllergens(newAllergens);
      if (newFlavors) setFlavors(newFlavors);
    }, socket);
    return () => unsubscribe();
  }, [socket]);

  // Initial load from backend API
  useEffect(() => {
    fetch('/api/admin/preferences/allergens')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setAllergens(data);
      })
      .catch(() => {});

    fetch('/api/admin/preferences/flavor-preferences')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setFlavors(data);
      })
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveActionMenuId(null);
      setShowSortDropdown(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Stats Calculations
  const totalAllergens = allergens.length;
  const activeAllergens = allergens.filter(a => (a.status || (a.active ? 'Active' : 'Inactive')) === 'Active').length;
  const inactiveAllergens = totalAllergens - activeAllergens;

  const totalFlavors = flavors.length;
  const activeFlavors = flavors.filter(f => (f.status || (f.active ? 'Active' : 'Inactive')) === 'Active').length;
  const inactiveFlavors = totalFlavors - activeFlavors;

  // Filtered Allergens with Sort
  const filteredAllergens = useMemo(() => {
    return allergens.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(allergenSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(allergenSearch.toLowerCase()));
      const isAct = (item.status || (item.active ? 'Active' : 'Inactive')) === 'Active';
      const matchesFilter = allergenFilter === 'all' ||
        (allergenFilter === 'active' && isAct) ||
        (allergenFilter === 'inactive' && !isAct);
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOrder === 'order-desc') return (b.display_order || b.order || 0) - (a.display_order || a.order || 0);
      return (a.display_order || a.order || 0) - (b.display_order || b.order || 0);
    });
  }, [allergens, allergenSearch, allergenFilter, sortOrder]);

  // Filtered Flavors with Sort
  const filteredFlavors = useMemo(() => {
    return flavors.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(flavorSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(flavorSearch.toLowerCase()));
      const isAct = (item.status || (item.active ? 'Active' : 'Inactive')) === 'Active';
      const matchesFilter = flavorFilter === 'all' ||
        (flavorFilter === 'active' && isAct) ||
        (flavorFilter === 'inactive' && !isAct);
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOrder === 'order-desc') return (b.display_order || b.order || 0) - (a.display_order || a.order || 0);
      return (a.display_order || a.order || 0) - (b.display_order || b.order || 0);
    });
  }, [flavors, flavorSearch, flavorFilter, sortOrder]);

  // Handle File Upload with Instant Preview & Validation
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Invalid file format. Allowed types: PNG, JPG, JPEG, WEBP.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setFormError('File size exceeds 3MB limit.');
      return;
    }

    setUploadStatus('uploading');
    setFormError('');

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      setFormImageUrl(dataUrl);
      setFormIconType('image');
      setUploadStatus('complete');
      setTimeout(() => setUploadStatus(null), 2000);
    };
    reader.onerror = () => {
      setFormError('Failed to read image file.');
      setUploadStatus('failed');
    };
    reader.readAsDataURL(file);
  };

  // Open Add Modal
  const handleOpenAdd = (type) => {
    setModalType(type);
    setModalMode('add');
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormIconType('emoji');
    setFormEmoji(type === 'allergen' ? '🥜' : '🔥');
    setFormImageUrl('');
    setFormStatus('Active');
    const currentList = type === 'allergen' ? allergens : flavors;
    setFormOrder(currentList.length + 1);
    setFormError('');
    setUploadStatus(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item, type) => {
    setModalType(type);
    setModalMode('edit');
    setEditingItem(item);
    setFormName(item.name || item.label || '');
    setFormDescription(item.description || '');
    setFormIconType(item.icon_type || (item.image_url || item.image ? 'image' : 'emoji'));
    setFormEmoji(item.emoji || (type === 'allergen' ? '🥜' : '🔥'));
    setFormImageUrl(item.image_url || item.image || '');
    setFormStatus(item.status || (item.active ? 'Active' : 'Inactive'));
    setFormOrder(item.display_order || item.order || 1);
    setFormError('');
    setUploadStatus(null);
    setIsModalOpen(true);
  };

  // Save Modal (Create or Update)
  const handleSaveModal = async (e) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Name is required.');
      return;
    }

    const isAllergen = modalType === 'allergen';
    const list = isAllergen ? allergens : flavors;

    // Check duplicate name (case-insensitive)
    const duplicate = list.find(
      it => it.name.toLowerCase().trim() === cleanName.toLowerCase() &&
        (!editingItem || it.id !== editingItem.id)
    );
    if (duplicate) {
      setFormError(isAllergen ? 'This allergen already exists.' : 'This preference already exists.');
      return;
    }

    if (formIconType === 'image' && !formImageUrl) {
      setFormError('Please upload an image or select Emoji.');
      return;
    }

    const payload = {
      name: cleanName,
      label: cleanName,
      description: formDescription.trim(),
      icon_type: formIconType,
      emoji: formIconType === 'emoji' ? formEmoji : '',
      image_url: formIconType === 'image' ? formImageUrl : '',
      image: formIconType === 'image' ? formImageUrl : '',
      status: formStatus,
      active: formStatus === 'Active',
      display_order: parseInt(formOrder, 10) || 1
    };

    try {
      if (modalMode === 'add') {
        if (isAllergen) {
          const created = await apiAddAllergen(payload, socket);
          const updated = [...allergens, created];
          setAllergens(saveAllergens(updated, socket));
          logAction('Allergen Created', `Admin added allergen: ${cleanName}`);
        } else {
          const created = await apiAddFlavor(payload, socket);
          const updated = [...flavors, created];
          setFlavors(saveFlavorPreferences(updated, socket));
          logAction('Flavor Preference Created', `Admin added flavor preference: ${cleanName}`);
        }
        showToast(`Added "${cleanName}" successfully!`);
      } else {
        // Edit
        if (isAllergen) {
          const updatedItem = await apiUpdateAllergen(editingItem.id, payload, socket);
          const updated = allergens.map(a => a.id === editingItem.id ? updatedItem : a);
          setAllergens(saveAllergens(updated, socket));
          logAction('Allergen Updated', `Admin updated allergen: ${cleanName}`);
        } else {
          const updatedItem = await apiUpdateFlavor(editingItem.id, payload, socket);
          const updated = flavors.map(f => f.id === editingItem.id ? updatedItem : f);
          setFlavors(saveFlavorPreferences(updated, socket));
          logAction('Flavor Preference Updated', `Admin updated flavor preference: ${cleanName}`);
        }
        showToast(`Updated "${cleanName}" successfully!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Operation failed. Please try again.');
    }
  };

  // Toggle Active / Inactive
  const handleToggleStatus = async (item, type) => {
    const isAllergen = type === 'allergen';
    const currentStatus = item.status || (item.active ? 'Active' : 'Inactive');
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    try {
      if (isAllergen) {
        const updatedItem = await apiUpdateAllergen(item.id, { ...item, status: newStatus, active: newStatus === 'Active' }, socket);
        const updated = allergens.map(a => a.id === item.id ? updatedItem : a);
        setAllergens(saveAllergens(updated, socket));
        logAction(
          newStatus === 'Active' ? 'Allergen Enabled' : 'Allergen Disabled',
          `Admin ${newStatus === 'Active' ? 'enabled' : 'disabled'} allergen: ${item.name}`
        );
      } else {
        const updatedItem = await apiUpdateFlavor(item.id, { ...item, status: newStatus, active: newStatus === 'Active' }, socket);
        const updated = flavors.map(f => f.id === item.id ? updatedItem : f);
        setFlavors(saveFlavorPreferences(updated, socket));
        logAction(
          newStatus === 'Active' ? 'Flavor Preference Enabled' : 'Flavor Preference Disabled',
          `Admin ${newStatus === 'Active' ? 'enabled' : 'disabled'} flavor preference: ${item.name}`
        );
      }
      showToast(`"${item.name}" marked as ${newStatus}.`);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Move Up / Move Down
  const handleMoveOrder = async (index, direction, type) => {
    const isAllergen = type === 'allergen';
    const list = isAllergen ? [...allergens] : [...flavors];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((it, idx) => ({
      ...it,
      display_order: idx + 1,
      order: idx + 1
    }));

    if (isAllergen) {
      setAllergens(saveAllergens(reordered, socket));
      await apiReorderPreferences('allergens', reordered, socket);
      logAction('Display Order Changed', 'Admin changed display order for Exclude Allergens');
    } else {
      setFlavors(saveFlavorPreferences(reordered, socket));
      await apiReorderPreferences('flavor_preferences', reordered, socket);
      logAction('Display Order Changed', 'Admin changed display order for Flavor Preferences');
    }
    showToast('Display order updated.');
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetIndex, type) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null);
      return;
    }

    const isAllergen = type === 'allergen';
    const list = isAllergen ? [...allergens] : [...flavors];
    const itemToMove = list.splice(draggedItemIndex, 1)[0];
    list.splice(targetIndex, 0, itemToMove);

    const reordered = list.map((it, idx) => ({
      ...it,
      display_order: idx + 1,
      order: idx + 1
    }));

    if (isAllergen) {
      setAllergens(saveAllergens(reordered, socket));
      await apiReorderPreferences('allergens', reordered, socket);
      logAction('Display Order Changed', `Admin reordered allergens via drag & drop`);
    } else {
      setFlavors(saveFlavorPreferences(reordered, socket));
      await apiReorderPreferences('flavor_preferences', reordered, socket);
      logAction('Display Order Changed', `Admin reordered flavor preferences via drag & drop`);
    }
    setDraggedItemIndex(null);
    showToast('Display order re-arranged.');
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteDialogItem) return;
    const isAllergen = deleteDialogItem.type === 'allergen';

    try {
      if (isAllergen) {
        await apiDeleteAllergen(deleteDialogItem.id, socket);
        const updated = allergens.filter(a => a.id !== deleteDialogItem.id);
        setAllergens(saveAllergens(updated, socket));
        logAction('Allergen Deleted', `Admin deleted allergen: ${deleteDialogItem.name}`);
      } else {
        await apiDeleteFlavor(deleteDialogItem.id, socket);
        const updated = flavors.filter(f => f.id !== deleteDialogItem.id);
        setFlavors(saveFlavorPreferences(updated, socket));
        logAction('Flavor Preference Deleted', `Admin deleted flavor preference: ${deleteDialogItem.name}`);
      }
      showToast(`Deleted "${deleteDialogItem.name}".`);
      setDeleteDialogItem(null);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Factory Reset Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all allergens and flavor preferences back to factory defaults?')) {
      const res = resetPreferencesToDefault(socket);
      setAllergens(res.allergens);
      setFlavors(res.flavors);
      logAction('Preferences Reset', 'Admin reset Menu Preferences to defaults');
      showToast('Reset all preferences to factory defaults.');
    }
  };

  return (
    <div className="admin-tab-pane fade-in admin-pref-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`admin-pref-toast admin-pref-toast--${toastMessage.type}`}>
          <CheckCircle2 size={16} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Breadcrumb Navigation matching Image 2 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6B7280', marginBottom: '14px' }}>
        <Home size={14} color="#6B7280" />
        <span style={{ cursor: 'pointer' }}>Admin Panel</span>
        <ChevronRight size={13} color="#9CA3AF" />
        <span style={{ color: '#374151', fontWeight: '600' }}>Menu Preferences</span>
      </div>

      {/* Main Management Header with Watermark & Actions matching Image 2 */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        {/* Decorative Oriental Landscape & Calligraphy Watermark matching Image 2 */}
        <div style={{
          position: 'absolute',
          right: '290px',
          top: '-18px',
          pointerEvents: 'none',
          opacity: 0.16,
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <svg width="220" height="90" viewBox="0 0 220 90" fill="none">
            <path d="M70,45 L110,45 M65,45 L115,45 M75,32 L105,32 M80,20 L100,20 M90,10 L90,20 M75,45 L75,70 M105,45 L105,70 M60,70 L120,70" stroke="#786456" strokeWidth="1.5" />
            <path d="M0,75 Q40,40 90,65 T180,60 T240,75" stroke="#786456" strokeWidth="1.5" fill="none" />
            <path d="M40,75 Q80,50 130,68 T220,65" stroke="#786456" strokeWidth="1" strokeDasharray="3 3" fill="none" />
            <path d="M180,20 Q160,35 150,55 M160,35 Q145,30 140,40 M170,25 Q175,15 185,15" stroke="#786456" strokeWidth="1.5" />
          </svg>
          <div style={{
            fontFamily: "'Brush Script MT', cursive, Georgia, serif",
            fontStyle: 'italic',
            fontSize: '25px',
            color: '#786456',
            whiteSpace: 'nowrap',
            transform: 'rotate(-5deg)',
            lineHeight: '1.15'
          }}>
            Bold Flavors<br />&nbsp;&nbsp;Better Together
          </div>
        </div>

        {/* Title and Subtitle */}
        <div style={{ zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>
              Menu Preferences
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ECFDF5',
              color: '#059669',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Live Sync Active
            </span>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              Last synced just now
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#6B7280' }}>
            Manage allergen exclusions and flavor preferences available to customers.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', zIndex: 1 }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s'
            }}
          >
            <RotateCcw size={15} />
            <span>Reset Defaults</span>
          </button>

          {activeTab === 'allergens' ? (
            <button
              type="button"
              onClick={() => handleOpenAdd('allergen')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #DC2626, #EA580C)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>+ Add Allergen</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenAdd('flavor')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #EA580C, #F59E0B)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>+ Add Flavor Preference</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Dashboard Summary Statistics Cards matching Image 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '22px' }}>
        {/* Card 1: Exclude Allergens */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#DC2626', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '8px' }}>
              <Shield size={14} color="#2563EB" fill="#2563EB" />
              <span>Exclude Allergens</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#111827', lineHeight: '1.1' }}>
              {totalAllergens} Total
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '6px' }}>
              <strong style={{ color: '#059669', fontWeight: '700' }}>{activeAllergens} Active</strong> &bull; {inactiveAllergens} Inactive
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626'
            }}>
              <Shield size={28} fill="#DC2626" color="#DC2626" />
            </div>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF'
            }}>
              <ChevronRight size={16} />
            </div>
          </div>
        </div>

        {/* Card 2: Flavor Preferences */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#D97706', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '8px' }}>
              <Sparkles size={14} color="#D97706" />
              <span>Flavor Preferences</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#111827', lineHeight: '1.1' }}>
              {totalFlavors} Total
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '6px' }}>
              <strong style={{ color: '#059669', fontWeight: '700' }}>{activeFlavors} Active</strong> &bull; {inactiveFlavors} Inactive
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706'
            }}>
              <Sparkles size={28} color="#D97706" />
            </div>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF'
            }}>
              <ChevronRight size={16} />
            </div>
          </div>
        </div>

        {/* Card 3: Customer Screen Status */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#4B5563', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '8px' }}>
              <Tv size={14} color="#059669" />
              <span>Customer Screen Status</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#10B981', lineHeight: '1.1' }}>
              Dynamic API
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '6px' }}>
              {activeAllergens + activeFlavors} options currently visible to customers
            </div>
          </div>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#D1FAE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669'
          }}>
            <ChevronRight size={28} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Tabs matching Image 2 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('allergens')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 22px',
            borderRadius: '12px',
            background: activeTab === 'allergens' ? '#FFFFFF' : 'transparent',
            border: activeTab === 'allergens' ? '1px solid #E5E7EB' : '1px solid transparent',
            borderBottom: activeTab === 'allergens' ? '3px solid #DC2626' : '1px solid transparent',
            boxShadow: activeTab === 'allergens' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'allergens' ? '700' : '500',
            color: activeTab === 'allergens' ? '#111827' : '#6B7280',
            transition: 'all 0.15s'
          }}
        >
          <Shield size={16} color="#2563EB" fill="#2563EB" />
          <span style={{ fontSize: '14px' }}>Exclude Allergens</span>
          <span style={{
            background: activeTab === 'allergens' ? '#FEE2E2' : '#E5E7EB',
            color: activeTab === 'allergens' ? '#DC2626' : '#6B7280',
            fontSize: '12px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '9999px',
            border: activeTab === 'allergens' ? '1px solid #FECACA' : 'none'
          }}>
            {allergens.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flavors')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 22px',
            borderRadius: '12px',
            background: activeTab === 'flavors' ? '#FFFFFF' : 'transparent',
            border: activeTab === 'flavors' ? '1px solid #E5E7EB' : '1px solid transparent',
            borderBottom: activeTab === 'flavors' ? '3px solid #EA580C' : '1px solid transparent',
            boxShadow: activeTab === 'flavors' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'flavors' ? '700' : '500',
            color: activeTab === 'flavors' ? '#111827' : '#6B7280',
            transition: 'all 0.15s'
          }}
        >
          <Sparkles size={16} color="#D97706" />
          <span style={{ fontSize: '14px' }}>Flavor Preferences</span>
          <span style={{
            background: activeTab === 'flavors' ? '#FEF3C7' : '#E5E7EB',
            color: activeTab === 'flavors' ? '#D97706' : '#6B7280',
            fontSize: '12px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '9999px'
          }}>
            {flavors.length}
          </span>
        </button>
      </div>

      {/* Main Table Card Container matching Image 2 */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E5E7EB',
        padding: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        marginBottom: '32px'
      }}>
        {/* Table Inside Header: Title, Description, and Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0 }}>
              {activeTab === 'allergens' ? 'Allergens' : 'Flavor Preferences'}
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
              {activeTab === 'allergens'
                ? 'Manage allergens that customers can exclude from their orders.'
                : 'Manage flavor preferences that customers can choose for their orders.'}
            </p>
          </div>

          {/* Toolbar: Search + Filter Pills + Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '9999px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder={activeTab === 'allergens' ? 'Search allergens...' : 'Search preferences...'}
                value={activeTab === 'allergens' ? allergenSearch : flavorSearch}
                onChange={e => activeTab === 'allergens' ? setAllergenSearch(e.target.value) : setFlavorSearch(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div style={{
              display: 'inline-flex',
              background: '#F3F4F6',
              padding: '3px',
              borderRadius: '9999px',
              gap: '2px'
            }}>
              {['all', 'active', 'inactive'].map(filter => {
                const currentFilter = activeTab === 'allergens' ? allergenFilter : flavorFilter;
                const isFilterActive = currentFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => activeTab === 'allergens' ? setAllergenFilter(filter) : setFlavorFilter(filter)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: isFilterActive ? '700' : '500',
                      border: 'none',
                      background: isFilterActive ? '#111827' : 'transparent',
                      color: isFilterActive ? '#FFFFFF' : '#4B5563',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSortDropdown(!showSortDropdown);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <ArrowUpDown size={14} />
                <span>
                  {sortOrder === 'name-asc' ? 'Sort by Name (A-Z)' :
                   sortOrder === 'name-desc' ? 'Sort by Name (Z-A)' :
                   sortOrder === 'order-desc' ? 'Sort by Order (Desc)' :
                   'Sort by Order'}
                </span>
                <ChevronDown size={14} />
              </button>

              {showSortDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '42px',
                    zIndex: 50,
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    border: '1px solid #E5E7EB',
                    minWidth: '180px',
                    padding: '4px',
                    textAlign: 'left'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => { setSortOrder('order-asc'); setShowSortDropdown(false); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: sortOrder === 'order-asc' ? '700' : '500',
                      color: sortOrder === 'order-asc' ? '#C24522' : '#374151',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Sort by Order (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortOrder('name-asc'); setShowSortDropdown(false); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: sortOrder === 'name-asc' ? '700' : '500',
                      color: sortOrder === 'name-asc' ? '#C24522' : '#374151',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Sort by Name (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortOrder('name-desc'); setShowSortDropdown(false); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: sortOrder === 'name-desc' ? '700' : '500',
                      color: sortOrder === 'name-desc' ? '#C24522' : '#374151',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Sort by Name (Z-A)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Rendering */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ width: '45px', textAlign: 'center', padding: '14px 8px', fontSize: '12px', fontWeight: '700', color: '#4B5563' }}>#</th>
                <th style={{ width: '70px', textAlign: 'center', padding: '14px 8px', fontSize: '12px', fontWeight: '700', color: '#4B5563' }}>Icon</th>
                <th style={{ width: '200px', padding: '14px 14px', fontSize: '12px', fontWeight: '700', color: '#4B5563' }}>
                  {activeTab === 'allergens' ? 'Allergen Name' : 'Flavor Name'}
                </th>
                <th style={{ padding: '14px 14px', fontSize: '12px', fontWeight: '700', color: '#4B5563' }}>Description</th>
                <th style={{ width: '130px', textAlign: 'center', padding: '14px 8px', fontSize: '12px', fontWeight: '700', color: '#4B5563' }}>Affected Items</th>
                <th style={{ width: '140px', textAlign: 'center', padding: '14px 8px', fontSize: '12px', fontWeight: '700', color: '#4B5563' }}>Customer Visible</th>
                <th style={{ width: '110px', textAlign: 'center', padding: '14px 8px', fontSize: '12px', fontWeight: '700', color: '#4B5563' }}>Status</th>
                <th style={{ width: '110px', textAlign: 'center', padding: '14px 12px', fontSize: '12px', fontWeight: '700', color: '#4B5563' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'allergens' ? filteredAllergens : filteredFlavors).length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: '#6B7280' }}>
                    <AlertTriangle size={36} color={activeTab === 'allergens' ? '#DC2626' : '#EA580C'} style={{ margin: '0 auto 10px', display: 'block' }} />
                    <strong style={{ fontSize: '15px', color: '#111827' }}>
                      No {activeTab === 'allergens' ? 'allergens' : 'flavor preferences'} found.
                    </strong>
                    <p style={{ fontSize: '13px', margin: '6px 0 0' }}>
                      Try adjusting your search or click "+ Add {activeTab === 'allergens' ? 'Allergen' : 'Flavor Preference'}".
                    </p>
                  </td>
                </tr>
              ) : (
                (activeTab === 'allergens' ? filteredAllergens : filteredFlavors).map((item, index) => {
                  const isActive = (item.status || (item.active ? 'Active' : 'Inactive')) === 'Active';
                  return (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, index)}
                      onDragOver={e => handleDragOver(e, index)}
                      onDrop={e => handleDrop(e, index, activeTab === 'allergens' ? 'allergen' : 'flavor')}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* # Column with drag handle */}
                      <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'grab' }}>
                          <GripVertical size={14} color="#9CA3AF" />
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>
                            {item.display_order || index + 1}
                          </span>
                        </div>
                      </td>

                      {/* Icon Column */}
                      <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: '#FAF5EE',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {item.icon_type === 'image' && (item.image_url || item.image) ? (
                            <img
                              src={item.image_url || item.image}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ fontSize: '26px' }}>{item.emoji || (activeTab === 'allergens' ? '🥜' : '🔥')}</span>
                          )}
                        </div>
                      </td>

                      {/* Name & ID Column */}
                      <td style={{ padding: '16px 14px' }}>
                        <strong style={{ fontSize: '14px', fontWeight: '700', color: '#111827', display: 'block' }}>
                          {item.name}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                          id: {item.id}
                        </span>
                      </td>

                      {/* Description Column */}
                      <td style={{ padding: '16px 14px', fontSize: '13px', color: '#4B5563', lineHeight: '1.4' }}>
                        {item.description || '—'}
                      </td>

                      {/* Affected Items Column */}
                      <td style={{ textAlign: 'center', padding: '16px 8px', fontSize: '14px', color: '#6B7280' }}>
                        —
                      </td>

                      {/* Customer Visible Column */}
                      <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item, activeTab === 'allergens' ? 'allergen' : 'flavor')}
                          title={isActive ? 'Visible to customers (click to disable)' : 'Hidden from customers (click to enable)'}
                          style={{
                            width: '44px',
                            height: '24px',
                            borderRadius: '9999px',
                            background: isActive ? '#10B981' : '#D1D5DB',
                            border: 'none',
                            padding: '2px',
                            cursor: 'pointer',
                            position: 'relative',
                            display: 'inline-block',
                            transition: 'background-color 0.2s',
                            verticalAlign: 'middle'
                          }}
                        >
                          <span
                            style={{
                              display: 'block',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#FFFFFF',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transform: isActive ? 'translateX(20px)' : 'translateX(0)',
                              transition: 'transform 0.2s ease-in-out'
                            }}
                          />
                        </button>
                      </td>

                      {/* Status Column */}
                      <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '0.5px',
                          background: isActive ? '#ECFDF5' : '#F3F4F6',
                          color: isActive ? '#059669' : '#6B7280',
                          textTransform: 'uppercase'
                        }}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td style={{ textAlign: 'center', padding: '16px 12px', position: 'relative' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item, activeTab === 'allergens' ? 'allergen' : 'flavor')}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: '1px solid #E5E7EB',
                              background: '#FFFFFF',
                              color: '#374151',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id);
                            }}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: '1px solid #E5E7EB',
                              background: '#FFFFFF',
                              color: '#374151',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            title="More actions"
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>

                        {/* Popover Action Menu */}
                        {activeActionMenuId === item.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '50px',
                              zIndex: 50,
                              background: '#FFFFFF',
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                              border: '1px solid #E5E7EB',
                              minWidth: '150px',
                              padding: '4px',
                              textAlign: 'left'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                handleOpenEdit(item, activeTab === 'allergens' ? 'allergen' : 'flavor');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#374151',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <Edit2 size={13} color="#6B7280" /> Edit
                            </button>

                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => {
                                setActiveActionMenuId(null);
                                handleMoveOrder(index, 'up', activeTab === 'allergens' ? 'allergen' : 'flavor');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: index === 0 ? '#9CA3AF' : '#374151',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <ArrowUp size={13} color={index === 0 ? '#D1D5DB' : '#6B7280'} /> Move Up
                            </button>

                            <button
                              type="button"
                              disabled={index === (activeTab === 'allergens' ? allergens.length : flavors.length) - 1}
                              onClick={() => {
                                setActiveActionMenuId(null);
                                handleMoveOrder(index, 'down', activeTab === 'allergens' ? 'allergen' : 'flavor');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: index === (activeTab === 'allergens' ? allergens.length : flavors.length) - 1 ? '#9CA3AF' : '#374151',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: index === (activeTab === 'allergens' ? allergens.length : flavors.length) - 1 ? 'not-allowed' : 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <ArrowDown size={13} color={index === (activeTab === 'allergens' ? allergens.length : flavors.length) - 1 ? '#D1D5DB' : '#6B7280'} /> Move Down
                            </button>

                            <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0' }} />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setDeleteDialogItem({ ...item, type: activeTab === 'allergens' ? 'allergen' : 'flavor' });
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#EF4444',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <Trash2 size={13} color="#EF4444" /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL / DRAWER: ADD / EDIT ALLERGEN OR FLAVOR PREFERENCE (IMAGE 2 UI) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-card-styled"
            style={{
              maxWidth: '620px',
              width: '94vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '28px 32px 24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#C24522',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(194, 69, 34, 0.25)'
                  }}
                >
                  {modalType === 'allergen' ? (
                    <Shield size={24} color="#FFFFFF" strokeWidth={2.4} />
                  ) : (
                    <Flame size={24} color="#FFFFFF" strokeWidth={2.4} />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
                    {modalMode === 'add'
                      ? (modalType === 'allergen' ? 'Add Allergen' : 'Add Flavor Preference')
                      : `Edit ${modalType === 'allergen' ? 'Allergen' : 'Flavor Preference'}`}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Configure customer option details, icon visual, display order, and status.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#F3F4F6',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4B5563',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {formError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#FEE2E2',
                      color: '#B91C1C',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '1px solid #FCA5A5'
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Name Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                    {modalType === 'allergen' ? 'Allergen Name' : 'Preference Name'} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={modalType === 'allergen' ? 'e.g. Shellfish, Eggs, Sesame' : 'e.g. Fruity, Creamy, Salty'}
                    value={formName}
                    onChange={e => {
                      setFormName(e.target.value);
                      if (formError) setFormError('');
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                      background: '#FFFFFF'
                    }}
                    required
                    autoFocus
                  />
                </div>

                {/* Description Field (Textarea matching Image 2) */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description or dietary explanation"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      background: '#FFFFFF'
                    }}
                  />
                </div>

                {/* Icon Type Selection (Segmented Pills matching Image 2) */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    Icon Type <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '10px',
                      padding: '3px',
                      gap: '4px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setFormIconType('emoji')}
                      style={{
                        background: formIconType === 'emoji' ? '#C24522' : 'transparent',
                        color: formIconType === 'emoji' ? '#FFFFFF' : '#4B5563',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: formIconType === 'emoji' ? '0 2px 4px rgba(194, 69, 34, 0.2)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Smile size={16} />
                      <span>Emoji</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormIconType('image')}
                      style={{
                        background: formIconType === 'image' ? '#C24522' : 'transparent',
                        color: formIconType === 'image' ? '#FFFFFF' : '#4B5563',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: formIconType === 'image' ? '0 2px 4px rgba(194, 69, 34, 0.2)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <ImageIcon size={16} />
                      <span>Upload Image</span>
                    </button>
                  </div>

                  {/* Option 1: Emoji (Cream Box matching Image 2) */}
                  {formIconType === 'emoji' && (
                    <div
                      style={{
                        background: '#FAF7F2',
                        border: '1px solid #F0E9DF',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        marginTop: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Big Preview Box */}
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '14px',
                            background: '#FFFFFF',
                            border: '2px solid #E89E78',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            boxShadow: '0 2px 6px rgba(228, 87, 41, 0.08)',
                            flexShrink: 0
                          }}
                        >
                          {formEmoji || (modalType === 'allergen' ? '🥜' : '🔥')}
                        </div>

                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#4B5563', display: 'block', marginBottom: '6px' }}>
                            Selected emoji
                          </label>
                          <input
                            type="text"
                            value={formEmoji}
                            onChange={e => setFormEmoji(e.target.value)}
                            placeholder="Emoji"
                            style={{
                              width: '180px',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: '1px solid #D1D5DB',
                              background: '#FFFFFF',
                              fontSize: '22px',
                              textAlign: 'center',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '16px' }}>
                        <CulinaryIconPicker
                          selectedEmoji={formEmoji}
                          defaultCategory={modalType === 'allergen' ? 'allergens' : 'flavors'}
                          title="Culinary Icon & Emoji Library"
                          subtitle="Pick from realistic culinary symbols, or search by allergen/flavor keyword."
                          onSelect={(emoji, item) => {
                            setFormEmoji(emoji);
                            if (!formName.trim() && item?.name) {
                              setFormName(item.name.split('&')[0].trim());
                            }
                            if (!formDescription.trim() && item?.description) {
                              setFormDescription(item.description);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Option 2: Upload Image */}
                  {formIconType === 'image' && (
                    <div style={{ marginTop: '12px' }}>
                      {formImageUrl ? (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '16px',
                            background: '#FAF7F2',
                            borderRadius: '16px',
                            border: '1px solid #F0E9DF'
                          }}
                        >
                          <div
                            style={{
                              width: '80px',
                              height: '80px',
                              margin: '0 auto 10px',
                              borderRadius: '14px',
                              border: '2px solid #E89E78',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#FFFFFF'
                            }}
                          >
                            <img src={formImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>
                            Image Preview
                          </div>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#374151',
                                cursor: 'pointer'
                              }}
                            >
                              Replace Image
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormImageUrl('');
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              style={{
                                background: '#FEE2E2',
                                border: '1px solid #FCA5A5',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#DC2626',
                                cursor: 'pointer'
                              }}
                            >
                              Remove Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            background: '#FAF7F2',
                            border: '2px dashed #D1D5DB',
                            borderRadius: '16px',
                            padding: '28px 20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease'
                          }}
                        >
                          <Upload size={28} color="#C24522" style={{ margin: '0 auto 8px', display: 'block' }} />
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                            Click to Upload Icon Image
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                            Supports: PNG, JPG, JPEG, WEBP (Max 3MB)
                          </div>
                        </div>
                      )}

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        style={{ display: 'none' }}
                      />

                      {uploadStatus === 'uploading' && (
                        <div style={{ fontSize: '12px', color: '#D97706', marginTop: '6px', fontWeight: '600' }}>
                          Uploading...
                        </div>
                      )}
                      {uploadStatus === 'complete' && (
                        <div style={{ fontSize: '12px', color: '#10B981', marginTop: '6px', fontWeight: '600' }}>
                          Upload Complete!
                        </div>
                      )}
                      {uploadStatus === 'failed' && (
                        <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px', fontWeight: '600' }}>
                          Upload Failed.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status & Display Order (2 Column Grid matching Image 2) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '4px' }}>
                  {/* Status Column */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                      Status <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: formStatus === 'Active' ? '#10B981' : '#9CA3AF',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      />
                      <select
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 36px 10px 32px',
                          borderRadius: '10px',
                          border: '1px solid #D1D5DB',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          background: '#FFFFFF',
                          appearance: 'none',
                          cursor: 'pointer',
                          outline: 'none',
                          height: '42px'
                        }}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      <ChevronDown
                        size={16}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#4B5563',
                          pointerEvents: 'none'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '5px', display: 'block' }}>
                      Set whether this {modalType === 'allergen' ? 'allergen' : 'preference'} is available for use.
                    </span>
                  </div>

                  {/* Display Order Column with Stepper Buttons */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                      Display Order <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid #D1D5DB',
                        borderRadius: '10px',
                        background: '#FFFFFF',
                        overflow: 'hidden',
                        height: '42px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setFormOrder(prev => Math.max(1, (parseInt(prev, 10) || 1) - 1))}
                        style={{
                          width: '44px',
                          height: '100%',
                          background: '#F9FAFB',
                          border: 'none',
                          borderRight: '1px solid #E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#4B5563'
                        }}
                        aria-label="Decrease display order"
                      >
                        <Minus size={15} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={formOrder}
                        onChange={e => setFormOrder(e.target.value)}
                        style={{
                          flex: 1,
                          height: '100%',
                          border: 'none',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: '600',
                          outline: 'none',
                          color: '#111827'
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setFormOrder(prev => (parseInt(prev, 10) || 0) + 1)}
                        style={{
                          width: '44px',
                          height: '100%',
                          background: '#F9FAFB',
                          border: 'none',
                          borderLeft: '1px solid #E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#4B5563'
                        }}
                        aria-label="Increase display order"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '5px', display: 'block' }}>
                      Determines the order in which it appears to customers.
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Actions (matching Image 2) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '26px',
                  paddingTop: '20px',
                  borderTop: '1px solid #F3F4F6'
                }}
              >
                <span style={{ fontSize: '12px', color: '#6B7280' }}>* Required fields</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #D1D5DB',
                      borderRadius: '10px',
                      padding: '10px 24px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: '#C24522',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 26px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(194, 69, 34, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={16} strokeWidth={3} />
                    <span>
                      {modalMode === 'add'
                        ? (modalType === 'allergen' ? 'Save Allergen' : 'Save Preference')
                        : 'Save Changes'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {deleteDialogItem && (
        <div className="admin-modal-overlay" onClick={() => setDeleteDialogItem(null)}>
          <div
            className="admin-modal-large"
            style={{ maxWidth: '440px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px 20px 16px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <Trash2 size={26} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#2C1A11', margin: '0 0 8px' }}>
                Delete "{deleteDialogItem.name}"?
              </h3>

              <p style={{ fontSize: '13px', color: '#786456', lineHeight: 1.45, margin: '0 0 20px' }}>
                This preference may be associated with existing menu items or customer selections.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setDeleteDialogItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn-primary"
                  style={{ background: '#DC2626', borderColor: '#DC2626' }}
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
