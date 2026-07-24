import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="logo">FoodHub Elite</h3>
          <p>Elevating the hospitality experience, one order at a time.</p>
        </div>
        <div className="footer-section">
          <h4>Discover</h4>
          <ul>
            <li>Restaurants</li>
            <li>Events</li>
            <li>Top Rated</li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Partner with us</h4>
          <ul>
            <li>For Restaurants</li>
            <li>For Couriers</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} FoodHub Elite. All rights reserved.</p>
      </div>
    </footer>
  );
}
