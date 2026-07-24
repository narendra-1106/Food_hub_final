// seed.js — Run with: node seed.js
// Seeds the database with a test restaurant and menu items

require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodhub';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clean old seed data
    await Restaurant.deleteMany({ name: 'Burger Palace' });

    // Create a seed owner user if not exists
    let owner = await User.findOne({ email: 'owner@burgerpalace.com' });
    if (!owner) {
      owner = await User.create({
        name: 'Palace Owner',
        email: 'owner@burgerpalace.com',
        password: 'password123',
        role: 'restaurant_partner'
      });
      console.log('Created owner user');
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      ownerId: owner._id,
      name: 'Burger Palace',
      description: 'The finest gourmet burgers in town, crafted with premium ingredients and love.',
      cuisine: ['Burgers', 'American', 'Fast Food'],
      location: {
        type: 'Point',
        coordinates: [73.8567, 18.5204] // Pune coordinates
      },
      address: 'Shop 5, MG Road, Pune, Maharashtra 411001',
      averageRating: 4.5,
      totalReviews: 128,
      isActive: true
    });
    console.log('Created restaurant:', restaurant.name);

    // Delete old menu items for this restaurant
    await MenuItem.deleteMany({ restaurantId: restaurant._id });

    // Create menu items
    const menuItems = [
      {
        restaurantId: restaurant._id,
        name: 'Classic Beef Burger',
        description: 'Juicy 200g beef patty with lettuce, tomato, cheese & special sauce',
        price: 249,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop',
        isAvailable: true
      },
      {
        restaurantId: restaurant._id,
        name: 'Crispy Chicken Burger',
        description: 'Golden fried chicken fillet with coleslaw, pickles & mayo in a toasted bun',
        price: 199,
        imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?q=80&w=1200&auto=format&fit=crop',
        isAvailable: true
      },
      {
        restaurantId: restaurant._id,
        name: 'Loaded Cheese Fries',
        description: 'Thick-cut fries smothered in melted cheddar, jalapeños & sour cream',
        price: 129,
        imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=1200&auto=format&fit=crop',
        isAvailable: true
      },
      {
        restaurantId: restaurant._id,
        name: 'Oreo Milkshake',
        description: 'Thick & creamy blended Oreo milkshake topped with whipped cream',
        price: 149,
        imageUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?q=80&w=1200&auto=format&fit=crop',
        isAvailable: true
      }
    ];

    await MenuItem.insertMany(menuItems);
    console.log(`Created ${menuItems.length} menu items`);

    console.log('\n✅ Seed complete!');
    console.log(`Restaurant ID: ${restaurant._id}`);
    mongoose.disconnect();
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
