import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { MOCK_RESTAURANTS, MOCK_MENU } from '../mockData';
import { getRestaurantById, toggleFavorite, getFavorites } from '../api';

export default function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart, totalItems } = useCart();
  const [addedId, setAddedId] = useState(null);
  
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isFav, setIsFav] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');
  const [vegOnly, setVegOnly] = useState(false);
  const token = localStorage.getItem('foodhub_token');

  useEffect(() => {
    async function fetchDetail() {
      try {
        const data = await getRestaurantById(id);
        setRestaurant(data.restaurant);
        setMenuItems(data.menuItems);
        setReviews(data.reviews || []);
      } catch (error) {
        console.error('Failed to fetch from API, using mock data', error);
        const mockRest = MOCK_RESTAURANTS.find(r => r._id === id);
        setRestaurant(mockRest);
        setMenuItems(MOCK_MENU[id] || []);
        setReviews([]);
      }

      if (token) {
        try {
          const favs = await getFavorites();
          setIsFav(favs.some(f => (f._id || f) === id));
        } catch (error) {
          const localFavs = JSON.parse(localStorage.getItem('foodhub_favs') || '[]');
          setIsFav(localFavs.includes(id));
        }
      } else {
        const localFavs = JSON.parse(localStorage.getItem('foodhub_favs') || '[]');
        setIsFav(localFavs.includes(id));
      }
      setLoading(false);
    }
    fetchDetail();
  }, [id, token]);

  const handleFavoriteToggle = async () => {
    if (!token) {
      const localFavs = JSON.parse(localStorage.getItem('foodhub_favs') || '[]');
      const idx = localFavs.indexOf(id);
      if (idx > -1) {
        localFavs.splice(idx, 1);
        setIsFav(false);
      } else {
        localFavs.push(id);
        setIsFav(true);
      }
      localStorage.setItem('foodhub_favs', JSON.stringify(localFavs));
      return;
    }

    try {
      const res = await toggleFavorite(id);
      setIsFav(res.favorites.includes(id));
      localStorage.setItem('foodhub_favs', JSON.stringify(res.favorites));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      const localFavs = JSON.parse(localStorage.getItem('foodhub_favs') || '[]');
      const idx = localFavs.indexOf(id);
      if (idx > -1) {
        localFavs.splice(idx, 1);
        setIsFav(false);
      } else {
        localFavs.push(id);
        setIsFav(true);
      }
      localStorage.setItem('foodhub_favs', JSON.stringify(localFavs));
    }
  };

  const handleAdd = (item) => {
    addToCart(item, restaurant._id, restaurant.name);
    setAddedId(item._id);
    setTimeout(() => setAddedId(null), 1000);
  };

  const getItemQty = (itemId) => {
    const found = cart.find(c => c.menuItemId === itemId);
    return found ? found.quantity : 0;
  };

  if (loading) {
    return <div className="loading-state">Loading restaurant details...</div>;
  }

  if (!restaurant) {
    return (
      <div style={{ textAlign: 'center', padding: '8rem 2rem' }}>
        <h2>Restaurant not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ maxWidth: 200, marginTop: '2rem' }}>
          ← Back to Home
        </button>
      </div>
    );
  }

  const isItemVeg = (item) => {
    if (item.isVeg !== undefined) return item.isVeg;
    if (item.tag && item.tag.toLowerCase().includes('veg')) return true;
    if (item.description && item.description.toLowerCase().includes('cottage cheese')) return true;
    return false;
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!vegOnly) return true;
    return isItemVeg(item);
  });

  const averageRating = restaurant.rating || restaurant.averageRating || 4.0;
  const totalReviews = reviews.length || restaurant.totalReviews || 0;

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (ratingDistribution[r.rating] !== undefined) {
      ratingDistribution[r.rating] += 1;
    }
  });

  return (
    <div className="restaurant-detail-page-clean">
      {/* Clean Minimalist Header */}
      <div className="restaurant-header-clean-block">
        <button className="back-btn-clean" onClick={() => navigate('/')}>← Back</button>
        
        <div className="restaurant-header-info-clean">
          <div className="restaurant-title-row">
            <h1>{restaurant.name}</h1>
            <button 
              onClick={handleFavoriteToggle} 
              className={`rest-heart-btn-clean ${isFav ? 'active' : ''}`}
            >
              {isFav ? '❤️ Saved' : '🤍 Save'}
            </button>
          </div>
          
          {restaurant.description && <p className="rest-description-clean">{restaurant.description}</p>}
          
          <div className="rest-meta-row-clean">
            <span className="meta-pill-clean" onClick={() => setActiveTab('reviews')} style={{ cursor: 'pointer' }}>
              ⭐ {averageRating} ({totalReviews} reviews)
            </span>
            <span className="meta-pill-clean">🕐 {restaurant.deliveryTime || '30-40 min'}</span>
            <span className="meta-pill-clean">📍 {restaurant.address || 'Pune'}</span>
            <span className="meta-pill-clean">Min ₹{restaurant.minOrder || 99}</span>
          </div>

          <div className="rest-cuisines-clean">
            {(Array.isArray(restaurant.cuisine) ? restaurant.cuisine : [restaurant.cuisine]).map(c => (
              <span key={c} className="cuisine-tag-clean">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs-bar-clean">
        <button 
          className={`detail-tab-btn-clean ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          🍽️ Menu
        </button>
        <button 
          className={`detail-tab-btn-clean ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          ⭐ Reviews ({totalReviews})
        </button>
      </div>

      {/* MENU TAB */}
      {activeTab === 'menu' && (
        <div className="menu-section-clean">
          <div className="menu-header-row-clean">
            <h2>Our Food Selection</h2>
            <div className="menu-actions-row">
              <button 
                className={`filter-btn-toggle-clean ${vegOnly ? 'active' : ''}`}
                onClick={() => setVegOnly(!vegOnly)}
              >
                🟢 Veg Only
              </button>
              {totalItems > 0 && (
                <button className="btn btn-primary view-cart-btn-clean" onClick={() => navigate('/checkout')}>
                  🛒 Checkout ({totalItems})
                </button>
              )}
            </div>
          </div>

          {/* Simple Row-Wise Menu List */}
          <div className="menu-list-rows">
            {filteredMenuItems.map(item => {
              const qty = getItemQty(item._id);
              const isJustAdded = addedId === item._id;
              const veg = isItemVeg(item);

              return (
                <div key={item._id} className="menu-row-card">
                  <div className="menu-row-details">
                    <div className="menu-row-title-line">
                      <span className={`veg-dot ${veg ? 'veg' : 'non-veg'}`}>●</span>
                      <h3 className="menu-item-name-clean">{item.name}</h3>
                      {item.category && <span className="category-tag-small">{item.category}</span>}
                    </div>
                    <p className="menu-item-desc-clean">{item.description}</p>
                    <span className="menu-item-price-clean">₹{item.price}</span>
                  </div>

                  <div className="menu-row-actions">
                    {qty === 0 ? (
                      <button
                        className={`btn add-btn-clean ${isJustAdded ? 'success' : 'primary'}`}
                        onClick={() => handleAdd(item)}
                      >
                        {isJustAdded ? '✓ Added' : '+ Add'}
                      </button>
                    ) : (
                      <div className="qty-control-clean">
                        <button onClick={() => handleAdd(item)} className="qty-btn-clean">+</button>
                        <span className="qty-count-clean">{qty}</span>
                        <span className="qty-label-clean">in cart</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMenuItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '3rem' }}>🥗</p>
              <p style={{ marginTop: '1rem' }}>No items match your menu filters.</p>
            </div>
          )}
        </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <div className="reviews-tab-section-clean">
          <div className="reviews-layout-clean">
            <div className="reviews-summary-panel-clean">
              <h3>Customer Feedback</h3>
              <div className="average-rating-box-clean">
                <span className="avg-num-clean">{averageRating}</span>
                <span className="avg-star-clean">★</span>
                <p className="total-revs-hint-clean">Based on {totalReviews} reviews</p>
              </div>

              <div className="rating-bars-list-clean">
                {[5, 4, 3, 2, 1].map(stars => {
                  const count = ratingDistribution[stars] || 0;
                  const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={stars} className="rating-bar-row-clean">
                      <span className="star-lbl-clean">{stars} ★</span>
                      <div className="bar-bg-clean">
                        <div className="bar-fill-clean" style={{ width: `${percent}%` }}></div>
                      </div>
                      <span className="count-lbl-clean">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="reviews-list-panel-clean">
              <h3>Recent Reviews</h3>
              <div className="reviews-scroll-list-clean">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev._id} className="review-card-clean">
                      <div className="review-card-header-clean">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="review-avatar-clean">
                            {rev.userId?.name ? rev.userId.name[0].toUpperCase() : '?'}
                          </span>
                          <div>
                            <h4 className="reviewer-name-clean">{rev.userId?.name || 'Anonymous User'}</h4>
                            <span className="review-stars-clean">
                              {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                            </span>
                          </div>
                        </div>
                        <span className="review-date-clean">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="review-text-clean">"{rev.text}"</p>
                      {rev.gamifiedPointsAwarded > 0 && (
                        <span className="review-points-badge-clean">
                          🏆 Acknowledged Review (+{rev.gamifiedPointsAwarded} pts)
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-reviews-clean">
                    <p style={{ fontSize: '3rem' }}>⭐</p>
                    <p>No reviews yet for {restaurant.name}.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <div className="floating-cart-bar-clean">
          <span>{totalItems} item{totalItems > 1 ? 's' : ''} added</span>
          <button className="btn btn-primary" onClick={() => navigate('/checkout')}>
            View Cart & Checkout →
          </button>
        </div>
      )}
    </div>
  );
}

