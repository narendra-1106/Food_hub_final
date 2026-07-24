import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { placeOrder, validateCoupon, getProfile, updateProfile } from '../api';

export default function Checkout() {
  const { cart, total, restaurantId, restaurantName, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  const [dbUser, setDbUser] = useState(null);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1);
  const [newAddressText, setNewAddressText] = useState('');
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('COD'); // COD, UPI, CARD
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [paymentError, setPaymentError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const DELIVERY_FEE = 49;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const grandTotal = Math.max(0, total + DELIVERY_FEE - discountAmount);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profileData = await getProfile();
        setDbUser(profileData);
        if (profileData.addresses && profileData.addresses.length > 0) {
          setSelectedAddressIndex(0);
        }
      } catch (err) {
        console.error('Failed to load profile from DB, using localStorage', err);
        const profile = JSON.parse(localStorage.getItem('foodhub_profile') || '{}');
        if (profile.firstName) {
          const fakeUser = {
            name: `${profile.firstName} ${profile.lastName || ''}`.trim(),
            phone: profile.phone,
            email: profile.email,
            deliveryAddress: profile.location,
            addresses: [profile.location]
          };
          setDbUser(fakeUser);
          setSelectedAddressIndex(0);
        }
      }
    }
    loadProfile();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await validateCoupon(couponCode, total);
      setAppliedCoupon(res);
      setCouponError('');
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddressText) return;
    try {
      const updatedAddresses = [...(dbUser.addresses || []), newAddressText];
      const updatedProfile = await updateProfile({ addresses: updatedAddresses });
      setDbUser(prev => ({ ...prev, addresses: updatedProfile.addresses }));
      setSelectedAddressIndex(updatedProfile.addresses.length - 1);
      setNewAddressText('');
      setShowAddAddressForm(false);
    } catch (err) {
      console.error('Failed to save address in DB, updating local state', err);
      const updatedAddresses = [...(dbUser?.addresses || []), newAddressText];
      setDbUser(prev => ({ ...prev, addresses: updatedAddresses }));
      setSelectedAddressIndex(updatedAddresses.length - 1);
      setNewAddressText('');
      setShowAddAddressForm(false);
    }
  };

  const handleConfirmOrder = async () => {
    const token = localStorage.getItem('foodhub_token');
    if (!token) {
      alert('Please login first to place an order.');
      navigate('/login');
      return;
    }

    if (!dbUser) {
      alert('Please complete your profile details first.');
      navigate('/profile');
      return;
    }

    let finalAddress = '';
    if (dbUser.addresses && dbUser.addresses.length > 0 && selectedAddressIndex > -1) {
      finalAddress = typeof dbUser.addresses[selectedAddressIndex] === 'string' 
        ? dbUser.addresses[selectedAddressIndex] 
        : dbUser.addresses[selectedAddressIndex].address;
    } else {
      finalAddress = dbUser.deliveryAddress;
    }

    if (!finalAddress) {
      alert('Please select or add a delivery address.');
      return;
    }

    // Validate payment inputs
    if (paymentMethod === 'UPI') {
      if (!upiId || !upiId.includes('@')) {
        setPaymentError('Please enter a valid UPI ID (e.g. name@upi)');
        return;
      }
    } else if (paymentMethod === 'CARD') {
      if (cardDetails.number.replace(/\s/g, '').length < 16) {
        setPaymentError('Please enter a valid 16-digit Card Number');
        return;
      }
      if (!cardDetails.expiry || !cardDetails.cvv || cardDetails.cvv.length < 3) {
        setPaymentError('Please enter valid Expiry and CVV');
        return;
      }
    }

    setIsSubmitting(true);
    setPaymentError('');

    try {
      const orderItems = cart.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        priceAtTimeOfOrder: item.price
      }));

      const paymentDetailsPayload = {
        method: paymentMethod,
        ...(paymentMethod === 'UPI' ? { upiId } : {}),
        ...(paymentMethod === 'CARD' ? { cardHolderName: cardDetails.name, maskedCardNumber: `**** **** **** ${cardDetails.number.slice(-4)}` } : {})
      };

      const apiOrder = await placeOrder({
        restaurantId,
        items: orderItems,
        totalAmount: grandTotal,
        deliveryAddress: finalAddress,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        discountAmount: discountAmount,
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetailsPayload
      });

      // Save locally to orders history for backup representation
      const details = {
        orderId: apiOrder._id,
        restaurant: restaurantName,
        items: [...cart],
        subtotal: total,
        discount: discountAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        deliveryFee: DELIVERY_FEE,
        grandTotal,
        deliveryAddress: finalAddress,
        customerName: dbUser.name || 'Consumer',
        phone: dbUser.phone || '',
        paymentMethod: paymentMethod,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        estimatedDelivery: '30-40 min'
      };

      const existing = JSON.parse(localStorage.getItem('foodhub_orders') || '[]');
      localStorage.setItem('foodhub_orders', JSON.stringify([details, ...existing]));

      clearCart();
      setIsSubmitting(false);
      navigate(`/track/${apiOrder._id}`);
    } catch (err) {
      console.error(err);
      alert('Order placement failed. Using local fallback.');
      
      const details = {
        orderId: 'ORD' + Math.floor(Math.random() * 900000 + 100000),
        restaurant: restaurantName,
        items: [...cart],
        subtotal: total,
        discount: discountAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        deliveryFee: DELIVERY_FEE,
        grandTotal,
        deliveryAddress: finalAddress,
        customerName: dbUser?.name || 'Guest User',
        phone: dbUser?.phone || '',
        paymentMethod: paymentMethod,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        estimatedDelivery: '30-40 min'
      };

      const existing = JSON.parse(localStorage.getItem('foodhub_orders') || '[]');
      localStorage.setItem('foodhub_orders', JSON.stringify([details, ...existing]));

      clearCart();
      setIsSubmitting(false);
      navigate(`/profile`); // Redirect to profile history if backend fails
    }
  };

  // ── EMPTY CART ──────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div className="checkout-container" style={{ textAlign: 'center', padding: '10vh 0' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🛒</div>
        <h2 className="checkout-header">Your Cart is Empty</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Add some delicious items from a restaurant!
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ maxWidth: '250px' }}>
          Browse Restaurants
        </button>
      </div>
    );
  }

  // ── CART & CHECKOUT ──────────────────────────────────────
  return (
    <div className="checkout-container animate-fade-in">
      <h2 className="checkout-header">🛒 Review & Checkout</h2>

      <div className="checkout-layout">
        {/* LEFT: Cart Items */}
        <div className="checkout-panel">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Items from <span style={{ color: 'var(--accent-primary)' }}>{restaurantName}</span></span>
            <span className="items-count-badge">{cart.length} items</span>
          </h3>

          <div className="cart-items-list-wrapper">
            {cart.map((item) => (
              <div key={item.menuItemId} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-unit">₹{item.price} each</span>
                </div>
                <div className="cart-item-controls">
                  <button className="qty-ctrl-btn" onClick={() => updateQuantity(item.menuItemId, -1)}>−</button>
                  <span className="qty-ctrl-count">{item.quantity}</span>
                  <button className="qty-ctrl-btn" onClick={() => updateQuantity(item.menuItemId, 1)}>+</button>
                  <span className="cart-item-subtotal">₹{(item.price * item.quantity).toFixed(0)}</span>
                  <button className="remove-btn" onClick={() => removeFromCart(item.menuItemId)} title="Remove">✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Coupon Input Area */}
          <div className="coupon-apply-box">
            <h4>🎟️ Apply Promo Code</h4>
            {appliedCoupon ? (
              <div className="coupon-applied-badge">
                <div className="coupon-badge-text">
                  <strong>{appliedCoupon.code}</strong> Applied! (-₹{appliedCoupon.discountAmount})
                </div>
                <button className="remove-coupon-btn" onClick={handleRemoveCoupon}>Remove</button>
              </div>
            ) : (
              <div className="coupon-input-row">
                <input 
                  type="text" 
                  placeholder="Try WELCOME50 or SAVE20" 
                  value={couponCode} 
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  className="coupon-input"
                />
                <button 
                  onClick={handleApplyCoupon} 
                  disabled={couponLoading || !couponCode}
                  className="btn btn-primary apply-coupon-btn"
                >
                  {couponLoading ? 'Checking...' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <p className="coupon-err-msg">{couponError}</p>}
          </div>

          {/* Totals */}
          <div className="totals-section">
            <div className="total-row">
              <span>Subtotal</span>
              <span>₹{total.toFixed(0)}</span>
            </div>
            {appliedCoupon && (
              <div className="total-row discount">
                <span>Coupon Discount ({appliedCoupon.code})</span>
                <span>-₹{discountAmount}</span>
              </div>
            )}
            <div className="total-row">
              <span>Delivery Fee</span>
              <span>₹{DELIVERY_FEE}</span>
            </div>
            <div className="total-row grand">
              <span>Grand Total</span>
              <span className="highlight">₹{grandTotal.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Delivery Details + Payment */}
        <div className="checkout-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>📍 Delivery Address</h3>

          {dbUser ? (
            <div className="delivery-info-box">
              {dbUser.addresses && dbUser.addresses.length > 0 ? (
                <div className="saved-addresses-selector">
                  {dbUser.addresses.map((addr, idx) => (
                    <div 
                      key={idx} 
                      className={`address-option-card ${selectedAddressIndex === idx ? 'selected' : ''}`}
                      onClick={() => setSelectedAddressIndex(idx)}
                    >
                      <div className="address-header">
                        <span className="address-lbl-badge">{idx === 0 ? 'Home' : `Address ${idx + 1}`}</span>
                        {selectedAddressIndex === idx && <span className="address-chk">✓ Selected</span>}
                      </div>
                      <p className="address-txt">{typeof addr === 'string' ? addr : addr.address}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-addresses-notice">
                  <p>No saved addresses found. Defaulting to profile address:</p>
                  <p className="fallback-address-text">{dbUser.deliveryAddress || 'Not entered yet'}</p>
                </div>
              )}

              {/* Add New Address Button/Form */}
              {!showAddAddressForm ? (
                <button 
                  className="btn add-address-trigger-btn"
                  onClick={() => setShowAddAddressForm(true)}
                  style={{ marginTop: '1rem', width: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border-glass)' }}
                >
                  ➕ Add New Delivery Address
                </button>
              ) : (
                <form onSubmit={handleAddAddress} className="add-address-mini-form">
                  <div className="form-group">
                    <label>Full Address</label>
                    <textarea 
                      placeholder="Flat No, Wing, Landmark, Area, City..." 
                      value={newAddressText}
                      onChange={e => setNewAddressText(e.target.value)}
                      className="form-input"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="mini-form-actions">
                    <button type="submit" className="btn btn-primary mini-btn">Save</button>
                    <button type="button" onClick={() => setShowAddAddressForm(false)} className="btn btn-secondary mini-btn">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="delivery-info-box no-profile">
              <p>⚠️ Complete your profile to set up your delivery addresses.</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/profile')}>
                Setup Profile →
              </button>
            </div>
          )}

          {/* PAYMENT METHOD SELECTOR */}
          <div className="payment-section">
            <h3 style={{ margin: '2rem 0 1rem 0' }}>💳 Payment Method</h3>
            
            <div className="payment-options-grid">
              <div 
                className={`payment-card ${paymentMethod === 'COD' ? 'selected' : ''}`}
                onClick={() => { setPaymentMethod('COD'); setPaymentError(''); }}
              >
                <span>💵 Cash on Delivery (COD)</span>
              </div>
              
              <div 
                className={`payment-card ${paymentMethod === 'UPI' ? 'selected' : ''}`}
                onClick={() => { setPaymentMethod('UPI'); setPaymentError(''); }}
              >
                <span>⚡ UPI (GooglePay / PhonePe)</span>
              </div>
              
              <div 
                className={`payment-card ${paymentMethod === 'CARD' ? 'selected' : ''}`}
                onClick={() => { setPaymentMethod('CARD'); setPaymentError(''); }}
              >
                <span>💳 Credit / Debit Card</span>
              </div>
            </div>

            {/* UPI Details Form */}
            {paymentMethod === 'UPI' && (
              <div className="payment-details-inputs animate-fade-in">
                <label>Enter UPI VPA ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. user@okhdfc" 
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="form-input"
                />
                <span className="input-hint">Order will be placed in COD mode if verification fails.</span>
              </div>
            )}

            {/* Card Details Form */}
            {paymentMethod === 'CARD' && (
              <div className="payment-details-inputs animate-fade-in card-form">
                <div className="form-group">
                  <label>Card Holder Name</label>
                  <input 
                    type="text" 
                    placeholder="Narendra Jagtap" 
                    value={cardDetails.name}
                    onChange={e => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Card Number</label>
                  <input 
                    type="text" 
                    placeholder="1234 5678 9876 5432" 
                    maxLength={19}
                    value={cardDetails.number.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim()}
                    onChange={e => setCardDetails(prev => ({ ...prev, number: e.target.value.replace(/\s/g, '') }))}
                    className="form-input"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input 
                      type="text" 
                      placeholder="MM/YY" 
                      maxLength={5}
                      value={cardDetails.expiry}
                      onChange={e => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input 
                      type="password" 
                      placeholder="***" 
                      maxLength={3}
                      value={cardDetails.cvv}
                      onChange={e => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentError && <p className="payment-err-msg">{paymentError}</p>}
          </div>

          <button
            className="btn btn-primary confirm-btn"
            onClick={handleConfirmOrder}
            disabled={!dbUser || isSubmitting}
            style={{ marginTop: '2rem' }}
          >
            {isSubmitting ? '🔄 Placing Order...' : dbUser ? `Place Order · ₹${grandTotal.toFixed(0)}` : 'Complete Profile First'}
          </button>
        </div>
      </div>
    </div>
  );
}
