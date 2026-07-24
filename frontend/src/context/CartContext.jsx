import React, { createContext, useState, useContext } from 'react';

export const CartContext = createContext({
  cart: [],
  restaurantId: null,
  restaurantName: '',
  total: 0,
  totalItems: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');

  const addToCart = (item, restId, restName = '') => {
    if (restaurantId && restaurantId !== restId) {
      alert('You can only order from one restaurant at a time. Clear your cart first.');
      return;
    }
    setRestaurantId(restId);
    if (restName) setRestaurantName(restName);
    setCart((prev) => {
      const existing = prev.find(i => i.menuItemId === item._id);
      if (existing) {
        return prev.map(i =>
          i.menuItemId === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId) => {
    setCart(prev => {
      const updated = prev.filter(i => i.menuItemId !== menuItemId);
      if (updated.length === 0) setRestaurantId(null);
      return updated;
    });
  };

  const updateQuantity = (menuItemId, delta) => {
    setCart(prev => {
      const updated = prev
        .map(i => i.menuItemId === menuItemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter(i => i.quantity > 0);
      if (updated.length === 0) setRestaurantId(null);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setRestaurantId(null);
    setRestaurantName('');
  };

  const total = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, restaurantId, restaurantName, addToCart, removeFromCart, updateQuantity, clearCart, total, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
