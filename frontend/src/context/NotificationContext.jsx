import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const { user } = useAuth();

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Add to history
    setNotifications(prev => [{ id, message, type, date: new Date(), read: false }, ...prev]);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket server
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Connected to socket in NotificationContext:', socket.id);
      
      // Join general notifications or roles
      if (user.role === 'admin') {
        socket.emit('join_order', 'admin'); // or listen for restaurant orders
      }
    });

    // Listen for order status updates for orders that this user might have
    socket.on('order_status_updated', (order) => {
      // If order belongs to this consumer
      if (order.consumerId === user._id) {
        let statusMsg = '';
        switch(order.status) {
          case 'ACCEPTED': statusMsg = 'has been accepted!'; break;
          case 'ORDER_PREPARING': statusMsg = 'is now preparing!'; break;
          case 'READY_FOR_PICKUP': statusMsg = 'is ready for pickup!'; break;
          case 'IN_TRANSIT': statusMsg = 'is out for delivery! 🛵'; break;
          case 'DELIVERED': statusMsg = 'has been delivered! Enjoy your meal! 🎉'; break;
          default: statusMsg = `status updated to ${order.status}`;
        }
        addToast(`Order #${order._id.substring(0, 8)} ${statusMsg}`, 'success');
      }
    });

    // Listen for new orders if role is admin or restaurant_partner
    socket.on('new_order', (order) => {
      if (user.role === 'admin' || (user.role === 'restaurant_partner' && order.restaurantId === user.restaurantId)) {
        addToast(`🔥 New Order Received! Order #${order._id.substring(0, 8)} for ₹${order.totalAmount}`, 'info');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, toasts, addToast, markAllAsRead, removeToast }}>
      {children}
      
      {/* Toast Render Area */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>✕</button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
