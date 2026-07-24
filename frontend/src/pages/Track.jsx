import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getOrderById } from '../api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


const ORDER_STEPS = [
  { key: 'pending',    icon: '📋', label: 'Order Placed',     desc: 'Your order has been received' },
  { key: 'confirmed',  icon: '✅', label: 'Order Confirmed',  desc: 'Restaurant accepted your order' },
  { key: 'preparing',  icon: '👨‍🍳', label: 'Preparing',       desc: 'Chef is preparing your food' },
  { key: 'on_the_way', icon: '🛵', label: 'On the Way',       desc: 'Delivery partner is heading to you' },
  { key: 'delivered',  icon: '🎉', label: 'Delivered',         desc: 'Enjoy your meal!' },
];

const STATUS_INDEX = {
  pending: 0, confirmed: 1, preparing: 2, on_the_way: 3, delivered: 4, cancelled: -1
};

const ETA_MINS = { pending: 35, confirmed: 30, preparing: 20, on_the_way: 8, delivered: 0 };

export default function Track() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0); // seconds since order placed
  const timerRef = useRef(null);
  const [mapDot, setMapDot] = useState({ x: 20, y: 70 }); // fake delivery dot

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderById(id);
        setOrder(data);
      } catch {
        setError('Order not found or access denied.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!id) return;
    const socket = io(SOCKET_URL);
    socket.emit('join_order', id);

    const handler = (data) => {
      if (data.orderId === id || data._id === id) {
        setOrder(prev => prev ? { ...prev, status: data.status } : null);
      }
    };
    socket.on('order_status_update', handler);
    socket.on('order_status_updated', handler);
    return () => {
      socket.off('order_status_update', handler);
      socket.off('order_status_updated', handler);
      socket.emit('leave_order', id);
      socket.disconnect();
    };
  }, [id]);


  // Elapsed timer
  useEffect(() => {
    if (!order?.createdAt) return;
    const start = new Date(order.createdAt).getTime();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [order?.createdAt]);

  // Animate fake delivery dot when on_the_way
  useEffect(() => {
    if (order?.status !== 'on_the_way') return;
    let t = 0;
    const ani = setInterval(() => {
      t += 1;
      setMapDot({ x: 20 + Math.min(t * 2, 60), y: 70 - Math.min(t * 0.5, 30) });
    }, 800);
    return () => clearInterval(ani);
  }, [order?.status]);

  if (loading) return (
    <div className="track-page">
      <div className="track-container">
        <div className="loading-shimmer" style={{ height: '80px', borderRadius: '1rem', marginBottom: '1rem' }} />
        <div className="loading-shimmer" style={{ height: '300px', borderRadius: '1rem' }} />
      </div>
    </div>
  );

  if (error) return (
    <div className="track-page">
      <div className="track-container" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
        <h2>{error}</h2>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0.6rem 2rem', marginTop: '1rem' }}
          onClick={() => navigate('/profile')}>
          ← Back to Profile
        </button>
      </div>
    </div>
  );

  const stepIdx = STATUS_INDEX[order?.status] ?? 0;
  const isCancelled = order?.status === 'cancelled';
  const eta = ETA_MINS[order?.status] ?? 0;
  const elapsedMins = Math.floor(elapsed / 60);

  return (
    <div className="track-page">
      <div className="track-container">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className="btn" onClick={() => navigate(-1)}
            style={{ width: 'auto', padding: '0.4rem 0.9rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '0.75rem' }}>
            ←
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
              {isCancelled ? '❌ Order Cancelled' : '📡 Live Tracking'}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Order #{order._id?.slice(-8).toUpperCase()} ·{' '}
              {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {!isCancelled && order.status !== 'delivered' && (
            <div className="eta-badge">
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>ETA</span>
              <strong style={{ fontSize: '1.1rem' }}>{eta} min</strong>
            </div>
          )}
        </div>

        {/* Fake Map */}
        {!isCancelled && (
          <div className="track-map">
            <div className="track-map-bg">
              {/* Mock road lines */}
              <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.25 }}>
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--border-color)" strokeWidth="2" strokeDasharray="10,8"/>
                <line x1="30%" y1="0" x2="30%" y2="100%" stroke="var(--border-color)" strokeWidth="2" strokeDasharray="10,8"/>
                <line x1="70%" y1="0" x2="70%" y2="100%" stroke="var(--border-color)" strokeWidth="2" strokeDasharray="10,8"/>
              </svg>
              {/* Restaurant pin */}
              <div className="map-pin restaurant-pin" style={{ left: '18%', top: '65%' }}>🍽️</div>
              {/* Delivery dot */}
              <div className="map-pin delivery-pin"
                style={{ left: `${mapDot.x}%`, top: `${mapDot.y}%`,
                  transition: 'left 0.8s ease, top 0.8s ease' }}>
                {order.status === 'on_the_way' ? '🛵' : order.status === 'delivered' ? '🎉' : '📍'}
              </div>
              {/* Home pin */}
              <div className="map-pin home-pin" style={{ right: '12%', top: '20%' }}>🏠</div>

              {/* Route line */}
              <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                <line x1="22%" y1="68%" x2={`${mapDot.x + 2}%`} y2={`${mapDot.y + 2}%`}
                  stroke="var(--accent-primary)" strokeWidth="2.5" strokeDasharray="8,5" opacity="0.7"/>
                <line x1={`${mapDot.x + 2}%`} y1={`${mapDot.y + 2}%`} x2="87%" y2="23%"
                  stroke="var(--border-color)" strokeWidth="2" strokeDasharray="6,5" opacity="0.4"/>
              </svg>
            </div>
            <div className="map-label">
              {order.status === 'on_the_way'
                ? '🛵 Your delivery partner is on the way!'
                : order.status === 'delivered'
                  ? '🎉 Delivered to your doorstep!'
                  : '📍 Live map updates when picked up'}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="track-timeline">
          {isCancelled ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>❌</div>
              <h3 style={{ margin: 0, color: '#ef4444' }}>Order Cancelled</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem' }}>
                Your order was cancelled. Refund will be processed if payment was made.
              </p>
              <Link to="/" className="btn btn-primary" style={{ width: 'auto', padding: '0.6rem 2rem', textDecoration: 'none' }}>
                Order Again →
              </Link>
            </div>
          ) : (
            ORDER_STEPS.map((step, i) => {
              const done = i <= stepIdx;
              const active = i === stepIdx;
              const future = i > stepIdx;
              return (
                <div key={step.key} className={`timeline-step ${active ? 'active' : ''} ${done && !active ? 'done' : ''} ${future ? 'future' : ''}`}>
                  <div className="timeline-icon-wrap">
                    <div className={`timeline-icon ${active ? 'pulse' : ''}`}>
                      {done ? (active ? step.icon : '✅') : step.icon}
                    </div>
                    {i < ORDER_STEPS.length - 1 && (
                      <div className={`timeline-line ${done ? 'done' : ''}`} />
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-label">{step.label}</div>
                    <div className="timeline-desc">{step.desc}</div>
                    {active && (
                      <div className="timeline-badge-active">
                        {order.status === 'on_the_way' ? `~${eta} min away` : 'In progress...'}
                      </div>
                    )}
                    {done && !active && (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.15rem' }}>Completed ✓</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order Summary */}
        <div className="track-summary-card">
          <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🛍️ Order Summary
          </h4>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span>{item.quantity}× {item.name}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent-primary)' }}>₹{order.totalAmount}</span>
          </div>
          {order.address && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              <strong style={{ color: 'var(--text-main)' }}>📍 Delivery to:</strong><br />{order.address}
            </div>
          )}
        </div>

        {/* Help */}
        <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
          Need help?{' '}
          <Link to="/profile" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Contact Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
