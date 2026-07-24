import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant,
  addMenuItem, updateMenuItem, deleteMenuItem,
  getAllOrders, updateOrderStatus,
  getAllUsers, updateUserRole,
  getCoupons, createCoupon, deleteCoupon,
} from '../api';

// Fetch menu items for a restaurant from the separate MenuItem collection
const getMenuItems = async (restaurantId) => {
  const { data } = await api.get(`/api/restaurants/${restaurantId}`);
  return data.menuItems || [];
};

// ─── Mini stat card ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, trend, color }) {
  return (
    <div className="stat-card" style={{ '--card-accent': color }}>
      <div className="stat-icon" style={{ background: `${color}22`, color }}>{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {trend !== undefined && (
          <div className="stat-trend" style={{ color: trend >= 0 ? '#10b981' : '#ef4444' }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% this week
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Simple bar chart ─────────────────────────────────────────────────────────
function BarChart({ data, color = 'var(--accent-primary)' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-wrap">
            <div className="bar-fill" style={{ height: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <div className="bar-label">{d.label}</div>
          <div className="bar-val">₹{d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:    { bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b' },
  confirmed:  { bg: 'rgba(59,130,246,0.18)',  color: '#3b82f6' },
  preparing:  { bg: 'rgba(168,85,247,0.18)',  color: '#a855f7' },
  on_the_way: { bg: 'rgba(14,165,233,0.18)',  color: '#0ea5e9' },
  delivered:  { bg: 'rgba(16,185,129,0.18)',  color: '#10b981' },
  cancelled:  { bg: 'rgba(239,68,68,0.18)',   color: '#ef4444' },
};

function Badge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '0.2rem 0.65rem', borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {status?.replace('_', ' ') || 'pending'}
    </span>
  );
}

// ─── Confirm dialog helper ────────────────────────────────────────────────────
const confirmDel = (name) => window.confirm(`Delete "${name}"? This cannot be undone.`);

// ─── Default form states ──────────────────────────────────────────────────────
const EMPTY_REST = { name: '', cuisine: '', address: '', image: '', deliveryTime: '30-45 min', rating: '4.0', priceRange: '₹₹', minOrder: '0' };
const EMPTY_ITEM = { name: '', price: '', description: '', category: 'Main Course', isVeg: true };
const EMPTY_COUPON = { code: '', discountType: 'percentage', discountValue: '', minOrderValue: '', maxDiscount: '', expiresAt: '' };

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const [activeSection, setActiveSection] = useState('dashboard');

  // Data states
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders]           = useState([]);
  const [users, setUsers]             = useState([]);
  const [coupons, setCoupons]         = useState([]);
  const [loading, setLoading]         = useState(true);

  // Restaurant CRUD
  const [restForm, setRestForm]       = useState(EMPTY_REST);
  const [editingRest, setEditingRest] = useState(null);
  const [showRestForm, setShowRestForm] = useState(false);

  // Menu item CRUD
  const [selectedRest, setSelectedRest]     = useState(null);
  const [menuItems, setMenuItems]           = useState([]);
  const [itemForm, setItemForm]             = useState(EMPTY_ITEM);
  const [editingItem, setEditingItem]       = useState(null);
  const [showItemForm, setShowItemForm]     = useState(false);

  // Coupon CRUD
  const [couponForm, setCouponForm]         = useState(EMPTY_COUPON);
  const [showCouponForm, setShowCouponForm] = useState(false);

  // Order filters
  const [orderFilter, setOrderFilter]       = useState('all');
  const [userSearch, setUserSearch]         = useState('');

  // Load all data
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const load = async () => {
      try {
        const [r, o, u, c] = await Promise.all([
          getRestaurants(), getAllOrders(), getAllUsers(), getCoupons()
        ]);
        setRestaurants(Array.isArray(r) ? r : []);
        setOrders(Array.isArray(o) ? o : []);
        setUsers(Array.isArray(u) ? u : []);
        setCoupons(Array.isArray(c) ? c : []);
      } catch (e) {
        console.error('Admin load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // ── Analytics ──────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const todayRevenue = todayOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Last 7 days revenue chart
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const chartData = days.map(d => ({
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      value: orders
        .filter(o => new Date(o.createdAt).toDateString() === d.toDateString() && o.status === 'delivered')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    }));

    return { totalRevenue, todayRevenue, todayOrders: todayOrders.length, chartData };
  }, [orders]);

  // ── Restaurant CRUD ────────────────────────────────────────────────────────
  const handleRestSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRest) {
        const updated = await updateRestaurant(editingRest._id, restForm);
        setRestaurants(prev => prev.map(r => r._id === editingRest._id ? updated : r));
      } else {
        const created = await createRestaurant(restForm);
        setRestaurants(prev => [...prev, created]);
      }
      setShowRestForm(false); setEditingRest(null); setRestForm(EMPTY_REST);
    } catch (err) {
      alert('Operation failed: ' + (err?.response?.data?.message || err.message || 'Unknown error'));
    }
  };

  const handleDeleteRest = async (rest) => {
    if (!confirmDel(rest.name)) return;
    try {
      await deleteRestaurant(rest._id);
      setRestaurants(prev => prev.filter(r => r._id !== rest._id));
    } catch { alert('Delete failed.'); }
  };

  // ── Menu Items ─────────────────────────────────────────────────────────────
  const openMenu = async (rest) => {
    setSelectedRest(rest);
    setMenuItems([]); // clear while loading
    setActiveSection('menu');
    try {
      const items = await getMenuItems(rest._id);
      setMenuItems(items);
    } catch {
      setMenuItems([]);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // updateMenuItem returns the updated MenuItem doc directly
        const updated = await updateMenuItem(selectedRest._id, editingItem._id, itemForm);
        setMenuItems(prev => prev.map(it => it._id === editingItem._id ? updated : it));
      } else {
        // addMenuItem returns the new MenuItem doc directly
        const newItem = await addMenuItem(selectedRest._id, itemForm);
        setMenuItems(prev => [...prev, newItem]);
      }
      setShowItemForm(false); setEditingItem(null); setItemForm(EMPTY_ITEM);
    } catch (err) {
      alert('Operation failed: ' + (err?.response?.data?.message || err.message || 'Unknown error'));
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirmDel(item.name)) return;
    try {
      await deleteMenuItem(selectedRest._id, item._id);
      setMenuItems(prev => prev.filter(it => it._id !== item._id));
    } catch { alert('Delete failed.'); }
  };

  // ── Orders ─────────────────────────────────────────────────────────────────
  const ORDER_STATUSES = ['pending','confirmed','preparing','on_the_way','delivered','cancelled'];

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch { alert('Status update failed.'); }
  };

  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);

  // ── Users ──────────────────────────────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch { alert('Role update failed.'); }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // ── Coupons ────────────────────────────────────────────────────────────────
  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      const created = await createCoupon(couponForm);
      setCoupons(prev => [...prev, created]);
      setShowCouponForm(false); setCouponForm(EMPTY_COUPON);
    } catch { alert('Coupon creation failed.'); }
  };

  const handleDeleteCoupon = async (coupon) => {
    if (!confirmDel(coupon.code)) return;
    try {
      await deleteCoupon(coupon._id);
      setCoupons(prev => prev.filter(c => c._id !== coupon._id));
    } catch { alert('Delete failed.'); }
  };

  const NAV = [
    { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
    { id: 'restaurants', icon: '🏪', label: 'Restaurants' },
    { id: 'menu',        icon: '🍽️', label: 'Menu', disabled: !selectedRest },
    { id: 'orders',      icon: '📦', label: 'Orders' },
    { id: 'users',       icon: '👥', label: 'Users' },
    { id: 'coupons',     icon: '🎫', label: 'Coupons' },
    { id: 'reports',     icon: '📈', label: 'Reports' },
  ];

  if (loading) return (
    <div className="admin-page">
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
        <p>Loading Admin Dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="admin-page">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span style={{ fontSize: '1.6rem' }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.1 }}>Admin Panel</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.name}</div>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV.map(n => (
            <button key={n.id}
              className={`admin-nav-btn ${activeSection === n.id ? 'active' : ''} ${n.disabled ? 'disabled' : ''}`}
              onClick={() => !n.disabled && setActiveSection(n.id)}
              disabled={n.disabled}>
              <span>{n.icon}</span> {n.label}
              {n.id === 'menu' && selectedRest && (
                <span style={{ fontSize: '0.72rem', opacity: 0.6, marginLeft: '0.25rem' }}>({selectedRest.name.slice(0, 10)}…)</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem' }}>
          <Link to="/" className="admin-nav-btn" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            🏠 <span>Back to App</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">

        {/* ── DASHBOARD ──────────────────────────────────────────────────── */}
        {activeSection === 'dashboard' && (
          <div>
            <h2 className="admin-page-title">📊 Dashboard Overview</h2>
            <div className="stat-grid">
              <StatCard icon="💰" label="Total Revenue" value={`₹${analytics.totalRevenue.toLocaleString('en-IN')}`} trend={12} color="#10b981" />
              <StatCard icon="📦" label="Total Orders" value={orders.length} trend={5} color="#3b82f6" />
              <StatCard icon="🏪" label="Restaurants" value={restaurants.length} color="#a855f7" />
              <StatCard icon="👥" label="Users" value={users.length} trend={8} color="#f59e0b" />
              <StatCard icon="📅" label="Today's Orders" value={analytics.todayOrders} color="#0ea5e9" />
              <StatCard icon="💵" label="Today's Revenue" value={`₹${analytics.todayRevenue.toLocaleString('en-IN')}`} color="#ec4899" />
            </div>

            {/* Revenue Chart */}
            <div className="admin-card" style={{ marginTop: '1.5rem' }}>
              <h3 className="admin-card-title">📈 Revenue (Last 7 Days)</h3>
              <BarChart data={analytics.chartData} color="var(--accent-primary)" />
            </div>

            {/* Recent Orders */}
            <div className="admin-card" style={{ marginTop: '1.5rem' }}>
              <h3 className="admin-card-title">🕐 Recent Orders</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map(o => (
                      <tr key={o._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>#{o._id?.slice(-6).toUpperCase()}</td>
                        <td>{o.user?.name || 'N/A'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>₹{o.totalAmount}</td>
                        <td><Badge status={o.status} /></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          {new Date(o.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Restaurants by order count */}
            <div className="admin-card" style={{ marginTop: '1.5rem' }}>
              <h3 className="admin-card-title">🏆 Top Restaurants</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>#</th><th>Restaurant</th><th>Cuisine</th><th>Rating</th></tr></thead>
                  <tbody>
                    {restaurants.slice(0, 6).map((r, i) => (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{i + 1}</td>
                        <td>{r.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{r.cuisine}</td>
                        <td>⭐ {r.rating || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── RESTAURANTS ───────────────────────────────────────────────── */}
        {activeSection === 'restaurants' && (
          <div>
            <div className="admin-section-header">
              <h2 className="admin-page-title">🏪 Restaurant Management</h2>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }}
                onClick={() => { setShowRestForm(v => !v); setEditingRest(null); setRestForm(EMPTY_REST); }}>
                {showRestForm ? '✕ Cancel' : '+ Add Restaurant'}
              </button>
            </div>

            {showRestForm && (
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="admin-card-title">{editingRest ? '✏️ Edit Restaurant' : '➕ New Restaurant'}</h3>
                <form onSubmit={handleRestSubmit} className="admin-form-grid">
                  {[
                    { name: 'name', label: 'Restaurant Name *', placeholder: 'e.g. Biryani House', required: true },
                    { name: 'cuisine', label: 'Cuisine', placeholder: 'e.g. Indian' },
                    { name: 'address', label: 'Address', placeholder: 'e.g. Shop 5, MG Road, Pune' },
                    { name: 'image', label: 'Image URL', placeholder: 'https://images.unsplash.com/...' },
                    { name: 'deliveryTime', label: 'Delivery Time', placeholder: 'e.g. 30-45 min' },
                    { name: 'rating', label: 'Rating (0-5)', placeholder: 'e.g. 4.3', type: 'number' },
                    { name: 'priceRange', label: 'Price Range', placeholder: 'e.g. ₹₹' },
                    { name: 'minOrder', label: 'Min Order (₹)', placeholder: 'e.g. 100', type: 'number' },
                  ].map(f => (
                    <div key={f.name} className="form-group">
                      <label className="form-label">{f.label}</label>
                      <input type={f.type || 'text'} className="form-input"
                        placeholder={f.placeholder} required={f.required}
                        value={restForm[f.name] || ''}
                        onChange={e => setRestForm(p => ({ ...p, [f.name]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" style={{ width: 'auto', padding: '0.5rem 1.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                      onClick={() => { setShowRestForm(false); setEditingRest(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }}>
                      {editingRest ? '💾 Update' : '✅ Create'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Cuisine</th><th>Rating</th><th>Delivery</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        {r.address && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.address}</div>}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine}</td>
                      <td>⭐ {r.rating || r.averageRating || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.deliveryTime || '—'}</td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600,
                          color: r.isActive !== false ? '#10b981' : '#ef4444',
                          background: r.isActive !== false ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          padding: '0.15rem 0.55rem', borderRadius: '999px'
                        }}>
                          {r.isActive !== false ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button className="admin-action-btn edit"
                            onClick={() => {
                              setEditingRest(r);
                              setRestForm({
                                name: r.name || '',
                                cuisine: Array.isArray(r.cuisine) ? r.cuisine.join(', ') : (r.cuisine || ''),
                                address: r.address || '',
                                image: r.image || '',
                                deliveryTime: r.deliveryTime || '30-45 min',
                                rating: r.rating || r.averageRating || '4.0',
                                priceRange: r.priceRange || '₹₹',
                                minOrder: r.minOrder || '0',
                              });
                              setShowRestForm(true);
                            }}>
                            ✏️ Edit
                          </button>
                          <button className="admin-action-btn menu"
                            onClick={() => openMenu(r)}>
                            🍽️ Menu
                          </button>
                          <button className="admin-action-btn delete"
                            onClick={() => handleDeleteRest(r)}>
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MENU ──────────────────────────────────────────────────────── */}
        {activeSection === 'menu' && selectedRest && (
          <div>
            <div className="admin-section-header">
              <div>
                <h2 className="admin-page-title">🍽️ Menu — {selectedRest.name}</h2>
                <button className="btn" onClick={() => setActiveSection('restaurants')}
                  style={{ width: 'auto', padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '0.5rem' }}>
                  ← Back to Restaurants
                </button>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }}
                onClick={() => { setShowItemForm(v => !v); setEditingItem(null); setItemForm(EMPTY_ITEM); }}>
                {showItemForm ? '✕ Cancel' : '+ Add Item'}
              </button>
            </div>

            {showItemForm && (
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="admin-card-title">{editingItem ? '✏️ Edit Item' : '➕ New Menu Item'}</h3>
                <form onSubmit={handleItemSubmit} className="admin-form-grid">
                  {[
                    { name: 'name', label: 'Item Name', placeholder: 'e.g. Chicken Biryani', required: true },
                    { name: 'price', label: 'Price (₹)', placeholder: 'e.g. 250', type: 'number', required: true },
                    { name: 'category', label: 'Category', placeholder: 'e.g. Main Course' },
                    { name: 'description', label: 'Description', placeholder: 'Short description...' },
                  ].map(f => (
                    <div key={f.name} className="form-group">
                      <label className="form-label">{f.label}</label>
                      <input type={f.type || 'text'} className="form-input"
                        placeholder={f.placeholder} required={f.required}
                        value={itemForm[f.name]}
                        onChange={e => setItemForm(p => ({ ...p, [f.name]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>🥗 Vegetarian</label>
                    <button type="button"
                      style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: '2px solid', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, background: itemForm.isVeg ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)', borderColor: itemForm.isVeg ? '#10b981' : '#ef4444', color: itemForm.isVeg ? '#10b981' : '#ef4444' }}
                      onClick={() => setItemForm(p => ({ ...p, isVeg: !p.isVeg }))}>
                      {itemForm.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                    </button>
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" style={{ width: 'auto', padding: '0.5rem 1.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                      onClick={() => { setShowItemForm(false); setEditingItem(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }}>
                      {editingItem ? '💾 Update' : '✅ Add Item'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Item</th><th>Category</th><th>Price</th><th>Type</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {menuItems.length > 0 ? menuItems.map(item => (
                    <tr key={item._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.description}</div>}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.category || '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>₹{item.price}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: item.isVeg ? '#10b981' : '#ef4444', background: item.isVeg ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                          {item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="admin-action-btn edit"
                            onClick={() => { setEditingItem(item); setItemForm({ name: item.name, price: item.price, description: item.description, category: item.category, isVeg: item.isVeg }); setShowItemForm(true); }}>
                            ✏️ Edit
                          </button>
                          <button className="admin-action-btn delete" onClick={() => handleDeleteItem(item)}>🗑️ Delete</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No menu items yet. Click "+ Add Item" above.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ORDERS ─────────────────────────────────────────────────────── */}
        {activeSection === 'orders' && (
          <div>
            <h2 className="admin-page-title">📦 Order Management</h2>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {['all', ...ORDER_STATUSES].map(s => (
                <button key={s} onClick={() => setOrderFilter(s)}
                  className={`filter-chip ${orderFilter === s ? 'active' : ''}`}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                  {s !== 'all' && (
                    <span style={{ marginLeft: '0.3rem', opacity: 0.7 }}>
                      ({orders.filter(o => o.status === s).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? filteredOrders.map(o => (
                    <tr key={o._id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>#{o._id?.slice(-6).toUpperCase()}</td>
                      <td>
                        <div>{o.user?.name || 'N/A'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{o.user?.email}</div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {o.items?.map(it => `${it.quantity}× ${it.name}`).join(', ').slice(0, 50) || '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>₹{o.totalAmount}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {new Date(o.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <select
                          value={o.status || 'pending'}
                          onChange={e => handleStatusChange(o._id, e.target.value)}
                          className="status-select"
                          style={{ '--sc': (STATUS_STYLES[o.status] || STATUS_STYLES.pending).color }}>
                          {ORDER_STATUSES.map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS ──────────────────────────────────────────────────────── */}
        {activeSection === 'users' && (
          <div>
            <h2 className="admin-page-title">👥 User Management</h2>
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                type="search"
                placeholder="🔍 Search users by name or email..."
                className="form-input"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ maxWidth: '400px' }}
              />
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>User</th><th>Email</th><th>Joined</th><th>Role</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{u.email}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <select
                          value={u.role || 'user'}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                          className="status-select"
                          style={{ '--sc': u.role === 'admin' ? '#a855f7' : '#3b82f6' }}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── COUPONS ─────────────────────────────────────────────────────── */}
        {activeSection === 'coupons' && (
          <div>
            <div className="admin-section-header">
              <h2 className="admin-page-title">🎫 Coupon Management</h2>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }}
                onClick={() => setShowCouponForm(v => !v)}>
                {showCouponForm ? '✕ Cancel' : '+ Create Coupon'}
              </button>
            </div>

            {showCouponForm && (
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="admin-card-title">➕ New Coupon</h3>
                <form onSubmit={handleCouponSubmit} className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">Code</label>
                    <input type="text" className="form-input" placeholder="e.g. SAVE20" required
                      value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount Type</label>
                    <select className="form-input" value={couponForm.discountType}
                      onChange={e => setCouponForm(p => ({ ...p, discountType: e.target.value }))}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat (₹)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount Value</label>
                    <input type="number" className="form-input" placeholder={couponForm.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 50'} required
                      value={couponForm.discountValue} onChange={e => setCouponForm(p => ({ ...p, discountValue: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Order Value (₹)</label>
                    <input type="number" className="form-input" placeholder="e.g. 200"
                      value={couponForm.minOrderValue} onChange={e => setCouponForm(p => ({ ...p, minOrderValue: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Discount (₹)</label>
                    <input type="number" className="form-input" placeholder="e.g. 100"
                      value={couponForm.maxDiscount} onChange={e => setCouponForm(p => ({ ...p, maxDiscount: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expires At</label>
                    <input type="date" className="form-input"
                      value={couponForm.expiresAt} onChange={e => setCouponForm(p => ({ ...p, expiresAt: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" style={{ width: 'auto', padding: '0.5rem 1.2rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                      onClick={() => setShowCouponForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }}>✅ Create</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {coupons.length > 0 ? coupons.map(c => (
                <div key={c._id} className="coupon-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="coupon-code">{c.code}</div>
                      <div className="coupon-value">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </div>
                    </div>
                    <button className="admin-action-btn delete" onClick={() => handleDeleteCoupon(c)}>🗑️</button>
                  </div>
                  <div className="coupon-meta">
                    {c.minOrderValue ? <span>Min: ₹{c.minOrderValue}</span> : null}
                    {c.maxDiscount ? <span>Max: ₹{c.maxDiscount}</span> : null}
                    {c.expiresAt ? <span>Expires: {new Date(c.expiresAt).toLocaleDateString('en-IN')}</span> : <span>No expiry</span>}
                  </div>
                </div>
              )) : (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '2.5rem' }}>🎫</div>
                  <p>No coupons yet. Create one above!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REPORTS ─────────────────────────────────────────────────────── */}
        {activeSection === 'reports' && (
          <div>
            <h2 className="admin-page-title">📈 Sales Reports</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Revenue', value: `₹${orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}`, icon: '💰', color: '#10b981' },
                { label: 'Avg Order Value', value: `₹${Math.round(orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.totalAmount, 0) / Math.max(orders.filter(o => o.status === 'delivered').length, 1))}`, icon: '📊', color: '#3b82f6' },
                { label: 'Cancelled Orders', value: orders.filter(o => o.status === 'cancelled').length, icon: '❌', color: '#ef4444' },
                { label: 'Conversion Rate', value: `${Math.round((orders.filter(o => o.status === 'delivered').length / Math.max(orders.length, 1)) * 100)}%`, icon: '📈', color: '#a855f7' },
              ].map(s => (
                <div key={s.label} className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                  <div style={{ fontSize: '2.2rem' }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-card">
              <h3 className="admin-card-title">📅 Revenue — Last 7 Days</h3>
              <BarChart data={analytics.chartData} color="#a855f7" />
            </div>

            <div className="admin-card" style={{ marginTop: '1.25rem' }}>
              <h3 className="admin-card-title">📊 Order Status Breakdown</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {Object.entries(STATUS_STYLES).map(([status, style]) => {
                  const count = orders.filter(o => o.status === status).length;
                  const pct = Math.round((count / Math.max(orders.length, 1)) * 100);
                  return (
                    <div key={status} style={{ flex: '1 1 130px', padding: '1rem', background: style.bg, borderRadius: '0.75rem', border: `1px solid ${style.color}44`, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: style.color }}>{count}</div>
                      <div style={{ fontSize: '0.78rem', color: style.color, textTransform: 'capitalize', fontWeight: 600 }}>{status.replace('_', ' ')}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
