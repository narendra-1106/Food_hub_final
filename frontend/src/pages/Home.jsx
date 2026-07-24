import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_RESTAURANTS } from '../mockData';
import { getRestaurants, toggleFavorite, getFavorites } from '../api';

const categories = ['All', 'Burgers', 'Pizza', 'Indian', 'Biryani', 'Fast Food'];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [vegOnly, setVegOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('default');
  const navigate = useNavigate();

  const profile = JSON.parse(localStorage.getItem('foodhub_profile') || '{}');
  const token = localStorage.getItem('foodhub_token');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getRestaurants();
        setRestaurants(data.length ? data : MOCK_RESTAURANTS);
      } catch (error) {
        console.error('Failed to fetch restaurants, using fallback mock data', error);
        setRestaurants(MOCK_RESTAURANTS);
      }

      if (token) {
        try {
          const favs = await getFavorites();
          setFavorites(favs.map(f => f._id || f));
        } catch (error) {
          console.error('Failed to fetch favorites from API, using localStorage fallback');
          const localFavs = JSON.parse(localStorage.getItem('foodhub_favs') || '[]');
          setFavorites(localFavs);
        }
      } else {
        const localFavs = JSON.parse(localStorage.getItem('foodhub_favs') || '[]');
        setFavorites(localFavs);
      }
      setLoading(false);
    }
    loadData();
  }, [token]);

  const handleFavoriteToggle = async (restaurantId, e) => {
    e.stopPropagation();
    if (!token) {
      let updatedFavs = [...favorites];
      const idx = updatedFavs.indexOf(restaurantId);
      if (idx > -1) {
        updatedFavs.splice(idx, 1);
      } else {
        updatedFavs.push(restaurantId);
      }
      setFavorites(updatedFavs);
      localStorage.setItem('foodhub_favs', JSON.stringify(updatedFavs));
      return;
    }

    try {
      const res = await toggleFavorite(restaurantId);
      setFavorites(res.favorites);
      localStorage.setItem('foodhub_favs', JSON.stringify(res.favorites));
    } catch (error) {
      console.error('Failed to toggle favorite on server:', error);
      let updatedFavs = [...favorites];
      const idx = updatedFavs.indexOf(restaurantId);
      if (idx > -1) {
        updatedFavs.splice(idx, 1);
      } else {
        updatedFavs.push(restaurantId);
      }
      setFavorites(updatedFavs);
      localStorage.setItem('foodhub_favs', JSON.stringify(updatedFavs));
    }
  };

  // Filter & Sort Logic
  let filtered = restaurants.filter(r => {
    const matchCat = activeCategory === 'All' || r.cuisine.includes(activeCategory);
    
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisine.some(c => c.toLowerCase().includes(search.toLowerCase())) ||
      (r.address && r.address.toLowerCase().includes(search.toLowerCase()));
      
    const isVegFriendly = r.cuisine.some(c => ['Indian', 'Pizza', 'Biryani', 'Vegetarian', 'Veg'].includes(c)) ||
      (r.description && r.description.toLowerCase().includes('veg'));
    const matchVeg = !vegOnly || isVegFriendly;

    const matchFav = !favoritesOnly || favorites.includes(r._id);

    const matchRating = (r.rating || r.averageRating || 0) >= minRating;

    return matchCat && matchSearch && matchVeg && matchFav && matchRating;
  });

  if (sortBy === 'rating') {
    filtered.sort((a, b) => (b.rating || b.averageRating || 0) - (a.rating || a.averageRating || 0));
  } else if (sortBy === 'price-low') {
    filtered.sort((a, b) => (a.minOrder || 0) - (b.minOrder || 0));
  } else if (sortBy === 'price-high') {
    filtered.sort((a, b) => (b.minOrder || 0) - (a.minOrder || 0));
  } else if (sortBy === 'time') {
    filtered.sort((a, b) => {
      const getVal = str => parseInt(str) || 999;
      return getVal(a.deliveryTime) - getVal(b.deliveryTime);
    });
  }

  if (loading) {
    return <div className="loading-state">Loading restaurants...</div>;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1>
            {profile.firstName
              ? `Hey ${profile.firstName}! 🍔`
              : 'Discover Premium Dining.'
            }
            <br />
            {profile.firstName ? 'What are you craving today?' : 'Delivered.'}
          </h1>
          <p>
            {profile.location
              ? `📍 Delivering to: ${profile.location}`
              : 'Experience the finest culinary creations from top-rated restaurants, right at your doorstep.'
            }
          </p>
          {!profile.firstName && (
            <button
              className="btn btn-primary hero-btn"
              onClick={() => navigate('/profile')}
            >
              👤 Setup Profile to Order
            </button>
          )}
          {profile.firstName && (
            <button
              className="btn btn-primary hero-btn"
              onClick={() => document.getElementById('restaurants').scrollIntoView({ behavior: 'smooth' })}
            >
              🍽️ Explore Restaurants
            </button>
          )}
        </div>
      </section>

      {/* Profile Prompt Banner */}
      {!profile.firstName && (
        <div className="profile-prompt-banner">
          <span>👋 Complete your profile for a personalized experience</span>
          <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem' }} onClick={() => navigate('/profile')}>
            Setup Profile
          </button>
        </div>
      )}

      {/* Search Bar */}
      <section className="search-section">
        <input
          type="text"
          placeholder="🔍 Search restaurants, cuisines, dishes..."
          className="home-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </section>

      {/* Filters and Sorting Controls */}
      <section className="filters-control-section">
        <div className="filters-container">
          <div className="filters-left">
            <button 
              className={`filter-btn-toggle ${vegOnly ? 'active' : ''}`}
              onClick={() => setVegOnly(!vegOnly)}
            >
              🟢 Veg Only
            </button>

            <button 
              className={`filter-btn-toggle ${favoritesOnly ? 'active' : ''}`}
              onClick={() => setFavoritesOnly(!favoritesOnly)}
            >
              ❤️ Favorites
            </button>

            <div className="filter-select-wrapper">
              <label>Rating</label>
              <select value={minRating} onChange={e => setMinRating(Number(e.target.value))}>
                <option value="0">All</option>
                <option value="4.0">4.0+ ★</option>
                <option value="4.5">4.5+ ★</option>
              </select>
            </div>
          </div>

          <div className="filters-right">
            <div className="filter-select-wrapper">
              <label>Sort By</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="default">Relevance</option>
                <option value="rating">Top Rated ⭐</option>
                <option value="price-low">Min Order: Low-High</option>
                <option value="price-high">Min Order: High-Low</option>
                <option value="time">Fastest Delivery 🕐</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories-section">
        <h2 className="categories-header">What are you craving?</h2>
        <div className="categories-scroll">
          {categories.map(cat => (
            <div
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'All' && '🍽️ '}
              {cat === 'Burgers' && '🍔 '}
              {cat === 'Pizza' && '🍕 '}
              {cat === 'Indian' && '🍛 '}
              {cat === 'Biryani' && '🍚 '}
              {cat === 'Fast Food' && '⚡ '}
              {cat}
            </div>
          ))}
        </div>
      </section>

      {/* Restaurant Grid */}
      <section className="restaurant-grid-section" id="restaurants">
        <h2 className="categories-header">
          {favoritesOnly ? '❤️ Your Favorite Restaurants' : activeCategory === 'All' ? '🔥 Featured Near You' : `${activeCategory} Restaurants`}
        </h2>
        
        <div className="grid">
          {filtered.map((rest) => {
            const isFav = favorites.includes(rest._id);
            return (
              <div
                key={rest._id}
                className="restaurant-card clean-card animate-fade-in"
                onClick={() => navigate(`/restaurant/${rest._id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-content-clean">
                  <div className="card-header-clean">
                    <div className="card-title-group">
                      <h3>{rest.name}</h3>
                      <p className="card-cuisine">{Array.isArray(rest.cuisine) ? rest.cuisine.join(' • ') : rest.cuisine}</p>
                    </div>
                    <button 
                      className={`card-heart-btn-clean ${isFav ? 'favorited' : ''}`}
                      onClick={(e) => handleFavoriteToggle(rest._id, e)}
                      title={isFav ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      {isFav ? '❤️' : '🤍'}
                    </button>
                  </div>

                  <p className="card-address">📍 {rest.address}</p>

                  <div className="card-footer-clean">
                    <div className="card-pills-row">
                      <span className="card-pill-item">⭐ {rest.rating || rest.averageRating || '4.0'}</span>
                      <span className="card-pill-item">🕐 {rest.deliveryTime || '30-40 min'}</span>
                      <span className="card-pill-item">Min ₹{rest.minOrder || 99}</span>
                    </div>
                    <button
                      className="btn btn-primary view-menu-btn-clean"
                      onClick={e => { e.stopPropagation(); navigate(`/restaurant/${rest._id}`); }}
                    >
                      Menu →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '3rem' }}>🔍</p>
              <p style={{ marginTop: '1rem' }}>No restaurants match your selected filters.</p>
              <button 
                className="btn btn-primary" 
                style={{ width: 'auto', marginTop: '1rem', display: 'inline-block' }}
                onClick={() => {
                  setSearch('');
                  setActiveCategory('All');
                  setVegOnly(false);
                  setFavoritesOnly(false);
                  setMinRating(0);
                  setSortBy('default');
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
