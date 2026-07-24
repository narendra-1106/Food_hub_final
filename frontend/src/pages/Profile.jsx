import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, getMyOrders, submitReview, makeAdmin } from '../api';

const STATUS_COLORS = {
  pending:    { bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b' },
  confirmed:  { bg: 'rgba(59,130,246,0.18)',  color: '#3b82f6' },
  preparing:  { bg: 'rgba(168,85,247,0.18)',  color: '#a855f7' },
  on_the_way: { bg: 'rgba(14,165,233,0.18)',  color: '#0ea5e9' },
  delivered:  { bg: 'rgba(16,185,129,0.18)',  color: '#10b981' },
  cancelled:  { bg: 'rgba(239,68,68,0.18)',   color: '#ef4444' },
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [adminLoading, setAdminLoading] = useState(false);

  // Address management
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState('');
  const [addingAddr, setAddingAddr] = useState(false);
  const [selectedAddrIdx, setSelectedAddrIdx] = useState(0);

  // Review modal
  const [reviewModal, setReviewModal] = useState(null); // { orderId, restaurantName }
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedOrders, setReviewedOrders] = useState(new Set());

  const [form, setForm] = useState({
    name: '', phone: '', email: '', location: ''
  });

  // Loyalty points (mock gamification)
  const loyaltyPts = orders.filter(o => o.status === 'delivered').length * 50 +
    reviewedOrders.size * 25;

  useEffect(() => {
    // Load from DB
    const load = async () => {
      try {
        const p = await getProfile();
        setForm({
          name: p.name || '',
          phone: p.phone || '',
          email: p.email || '',
          location: p.addresses?.[0] || p.location || '',
        });
        setAddresses(p.addresses || (p.location ? [p.location] : []));
        setSelectedAddrIdx(0);
      } catch {
        // fallback to localStorage
        const stored = localStorage.getItem('foodhub_profile');
        if (stored) {
          const s = JSON.parse(stored);
          setForm(s);
          setAddresses(s.addresses || (s.location ? [s.location] : []));
        }
      }
    };
    load();

    const fetchOrders = async () => {
      try {
        const data = await getMyOrders();
        setOrders(Array.isArray(data) ? data : []);
      } catch {
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const d = await res.json();
          const addr = d?.display_name || `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setForm(p => ({ ...p, location: addr }));
        } catch {
          setForm(p => ({ ...p, location: `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        } finally { setLocating(false); }
      },
      () => { alert('Location denied.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      alert('Please fill in Name and Phone.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, addresses };
      const updated = await updateProfile(payload);
      if (setUser) setUser({ ...updated });
      localStorage.setItem('foodhub_profile', JSON.stringify(payload));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Address management
  const addAddress = () => {
    if (!newAddress.trim()) return;
    const updated = [...addresses, newAddress.trim()];
    setAddresses(updated);
    setNewAddress('');
    setAddingAddr(false);
  };

  const removeAddress = (idx) => {
    const updated = addresses.filter((_, i) => i !== idx);
    setAddresses(updated);
    if (selectedAddrIdx >= updated.length) setSelectedAddrIdx(Math.max(0, updated.length - 1));
  };

  const setDefault = (idx) => {
    const updated = [...addresses];
    const [item] = updated.splice(idx, 1);
    updated.unshift(item);
    setAddresses(updated);
    setSelectedAddrIdx(0);
  };

  // Review Modal
  const openReview = (order) => {
    setReviewModal({ orderId: order._id, restaurantName: order.restaurant?.name || 'Restaurant' });
    setReviewForm({ rating: 5, comment: '' });
  };

  const submitReviewHandler = async () => {
    if (!reviewForm.comment.trim()) { alert('Please write a comment.'); return; }
    setSubmittingReview(true);
    try {
      await submitReview(reviewModal.orderId, reviewForm);
      setReviewedOrders(prev => new Set([...prev, reviewModal.orderId]));
      setReviewModal(null);
    } catch {
      alert('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Become Admin
  const becomeAdmin = async () => {
    if (!window.confirm('Enable admin access for demo purposes?')) return;
    setAdminLoading(true);
    try {
      const updated = await makeAdmin();
      if (setUser) setUser({ role: 'admin' });
      alert('✅ You are now an Admin! Redirecting to Admin Dashboard...');
      navigate('/admin');
    } catch {
      alert('Failed to enable admin. Make sure you are logged in.');
    } finally {
      setAdminLoading(false);
    }
  };

  const firstName = form.name?.split(' ')[0] || (user?.name?.split(' ')[0]) || 'User';
  const initials = form.name
    ? form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.name ? user.name[0].toUpperCase() : '?');

  const TABS = [
    { id: 'info', label: '👤 Profile' },
    { id: 'addresses', label: '📍 Addresses' },
    { id: 'orders', label: `📦 Orders ${orders.length > 0 ? `(${orders.length})` : ''}` },
    { id: 'settings', label: '⚙️ Settings' },
  ];

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h1 className="profile-title">Hey, {firstName}! 👋</h1>
            <p className="profile-subtitle">
              {user?.role === 'admin'
                ? '🛡️ Admin Account · Manage your food empire'
                : 'Manage your profile, addresses & orders'}
            </p>
          </div>
          {user?.role === 'admin' && (
            <Link to="/admin" className="btn btn-primary" style={{ marginLeft: 'auto', textDecoration: 'none', padding: '0.5rem 1.2rem' }}>
              🛡️ Admin Dashboard
            </Link>
          )}
        </div>

        {/* Loyalty Card */}
        <div className="loyalty-card">
          <div className="loyalty-icon">🏆</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0 }}>Loyalty Points</h4>
            <p className="loyalty-pts">{loyaltyPts} pts</p>
            <p className="loyalty-hint">
              {orders.filter(o => o.status === 'delivered').length} orders × 50pts +{' '}
              {reviewedOrders.size} reviews × 25pts
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <span style={{
              fontSize: '0.75rem', color: 'var(--text-muted)',
              background: 'rgba(245,158,11,0.2)', padding: '0.2rem 0.7rem',
              borderRadius: '999px', border: '1px solid rgba(245,158,11,0.4)'
            }}>
              {loyaltyPts >= 500 ? '🥇 Gold' : loyaltyPts >= 200 ? '🥈 Silver' : '🥉 Bronze'}
            </span>
            <div className="loyalty-bar-outer">
              <div className="loyalty-bar-inner" style={{ width: `${Math.min((loyaltyPts % 500) / 5, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="profile-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`profile-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB: Profile Info */}
        {activeTab === 'info' && (
          <form onSubmit={handleSave} className="profile-form">
            <div className="form-group">
              <label className="form-label"><span className="label-icon">👤</span> Full Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Narendra Jagtap" className="form-input" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><span className="label-icon">📞</span> Phone *</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                  placeholder="+91 98765 43210" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label"><span className="label-icon">✉️</span> Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com" className="form-input" readOnly
                  style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  <span className="label-icon">📍</span> Primary Delivery Address *
                </label>
                <button type="button" onClick={detectLocation} disabled={locating}
                  className="btn" style={{
                    width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem',
                    background: 'rgba(139,92,246,0.2)', border: '1px solid var(--accent-primary)',
                    color: 'var(--text-main)', borderRadius: '999px',
                  }}>
                  {locating ? '🔄 Detecting...' : '🎯 Auto-Detect'}
                </button>
              </div>
              <textarea name="location" value={form.location} onChange={handleChange}
                placeholder="Flat 12, Shivaji Nagar, Pune - 411005" className="form-input form-textarea"
                rows={3} />
            </div>

            <button type="submit" disabled={saving}
              className={`btn ${saved ? 'btn-success' : 'btn-primary'} profile-save-btn`}>
              {saving ? '⏳ Saving...' : saved ? '✅ Profile Saved!' : '💾 Save Profile'}
            </button>
          </form>
        )}

        {/* TAB: Addresses */}
        {activeTab === 'addresses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📍 Saved Addresses</h3>
              <button className="btn btn-primary"
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={() => setAddingAddr(v => !v)}>
                {addingAddr ? '✕ Cancel' : '+ Add Address'}
              </button>
            </div>

            {addingAddr && (
              <div className="addr-add-box">
                <textarea
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="Enter full address..."
                  className="form-input form-textarea"
                  rows={2}
                />
                <button className="btn btn-primary"
                  style={{ width: 'auto', padding: '0.5rem 1rem', marginTop: '0.5rem' }}
                  onClick={addAddress}>
                  ✅ Save Address
                </button>
              </div>
            )}

            {addresses.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '2.5rem' }}>📭</div>
                <p>No addresses saved yet.</p>
              </div>
            ) : (
              addresses.map((addr, idx) => (
                <div key={idx} className={`addr-card ${idx === 0 ? 'addr-default' : ''}`}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '1.5rem' }}>{idx === 0 ? '🏠' : '📍'}</div>
                    <div style={{ flex: 1 }}>
                      {idx === 0 && (
                        <span className="badge-default">Default</span>
                      )}
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                        {addr}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {idx !== 0 && (
                        <button className="btn" onClick={() => setDefault(idx)}
                          style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: 'rgba(139,92,246,0.2)', border: '1px solid var(--accent-primary)', color: 'var(--text-main)', borderRadius: '0.5rem' }}>
                          Set Default
                        </button>
                      )}
                      <button className="btn" onClick={() => removeAddress(idx)}
                        style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: '0.5rem' }}>
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: Orders */}
        {activeTab === 'orders' && (
          <div>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📦 Order History
            </h3>
            {loadingOrders ? (
              <div className="loading-shimmer" style={{ height: '120px', borderRadius: '0.75rem' }} />
            ) : orders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map((order) => {
                  const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
                  const canReview = order.status === 'delivered' && !reviewedOrders.has(order._id);
                  return (
                    <div key={order._id} className="order-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>Order #{order._id?.slice(-6).toUpperCase()}</strong>
                          <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{
                            background: sc.bg, color: sc.color,
                            padding: '0.25rem 0.75rem', borderRadius: '999px',
                            fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize'
                          }}>
                            {order.status?.replace('_', ' ') || 'Pending'}
                          </span>
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Link to={`/track/${order._id}`}
                              style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                              Track →
                            </Link>
                          )}
                        </div>
                      </div>

                      {order.items?.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          {order.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '0.2rem 0', color: 'var(--text-muted)' }}>
                              <span>{item.quantity}× {item.name}</span>
                              <span>₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        <strong style={{ color: 'var(--accent-primary)', fontSize: '1rem' }}>₹{order.totalAmount}</strong>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canReview && (
                            <button className="btn btn-primary"
                              style={{ width: 'auto', padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                              onClick={() => openReview(order)}>
                              ⭐ Write Review
                            </button>
                          )}
                          {reviewedOrders.has(order._id) && (
                            <span style={{ fontSize: '0.78rem', color: '#10b981' }}>✅ Reviewed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div style={{ fontSize: '3rem' }}>🛍️</div>
                <p style={{ margin: '0.5rem 0' }}>No orders yet</p>
                <Link to="/" className="btn btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem', textDecoration: 'none', marginTop: '0.5rem' }}>
                  Order Now →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB: Settings */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0 }}>⚙️ Account Settings</h3>

            <div className="settings-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0 }}>🛡️ Admin Access (Demo)</h4>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    {user?.role === 'admin'
                      ? 'You already have admin privileges.'
                      : 'Unlock admin dashboard for demonstration purposes.'}
                  </p>
                </div>
                {user?.role !== 'admin' ? (
                  <button className="btn btn-primary"
                    style={{ width: 'auto', padding: '0.5rem 1.2rem', flexShrink: 0 }}
                    onClick={becomeAdmin}
                    disabled={adminLoading}>
                    {adminLoading ? '⏳ Enabling...' : '🔓 Become Admin'}
                  </button>
                ) : (
                  <Link to="/admin" className="btn btn-primary"
                    style={{ width: 'auto', padding: '0.5rem 1.2rem', textDecoration: 'none', flexShrink: 0 }}>
                    🛡️ Go to Dashboard
                  </Link>
                )}
              </div>
            </div>

            <div className="settings-card">
              <h4 style={{ margin: '0 0 0.5rem' }}>📊 Account Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Total Orders', value: orders.length },
                  { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length },
                  { label: 'Reviews', value: reviewedOrders.size },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    textAlign: 'center', padding: '1rem',
                    background: 'var(--bg-color)', borderRadius: '0.75rem',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{value}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setReviewModal(null)}>✕</button>
            <h3 style={{ marginBottom: '0.25rem' }}>⭐ Write a Review</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              for <strong>{reviewModal.restaurantName}</strong>
            </p>

            {/* Star Rating */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '2rem' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} style={{ cursor: 'pointer', filter: star <= reviewForm.rating ? 'none' : 'grayscale(1)', transition: 'transform 0.15s', transform: star <= reviewForm.rating ? 'scale(1.1)' : 'scale(1)' }}
                  onClick={() => setReviewForm(p => ({ ...p, rating: star }))}>
                  ⭐
                </span>
              ))}
            </div>

            <textarea
              value={reviewForm.comment}
              onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
              placeholder="Share your experience... (min 10 characters)"
              className="form-input form-textarea"
              rows={4}
              style={{ marginBottom: '1rem' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn" style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                onClick={() => setReviewModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={submitReviewHandler}
                disabled={submittingReview || reviewForm.comment.length < 10}>
                {submittingReview ? '⏳ Submitting...' : '🚀 Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
