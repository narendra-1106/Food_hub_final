const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const orderRoutes = require('./routes/orders');
const couponRoutes = require('./routes/coupons');

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make Socket.IO accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);

// Serve Frontend in Production
const path = require('path');
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuildPath));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Socket.io integration
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined order room: ${orderId}`);
  });

  socket.on('leave_order', (orderId) => {
    socket.leave(`order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ── Database connection with in-memory fallback ────────────────────────────────
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  // Try Atlas first (with a 8 second timeout)
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to MongoDB Atlas');
    // Drop stale phone index if present
    try { await mongoose.connection.collection('users').dropIndex('phone_1'); } catch {}
    // Ensure admin user + sample data exists
    await seedStarterData();
    return;

  } catch (atlasErr) {
    console.warn('⚠️  Atlas connection failed:', atlasErr.message);
    console.log('🔄 Falling back to in-memory MongoDB...');
  }

  // Fallback: mongodb-memory-server
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log('✅ Connected to in-memory MongoDB (data resets on restart)');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ⚠️  RUNNING WITH IN-MEMORY DATABASE');
    console.log('  Atlas is unreachable from this network.');
    console.log('  All data will be lost when the server restarts.');
    console.log('  To fix: Add your IP to MongoDB Atlas → Network Access.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Seed some starter data so the app works immediately
    await seedStarterData();
  } catch (memErr) {
    console.error('❌ In-memory MongoDB also failed:', memErr.message);
    console.error('Please install MongoDB locally or fix your network connection to Atlas.');
    process.exit(1);
  }
}

async function seedStarterData() {
  const User = require('./models/User');
  const Restaurant = require('./models/Restaurant');
  const MenuItem = require('./models/MenuItem');
  const Coupon = require('./models/Coupon');

  try {
    // Create admin users
    const adminEmails = ['narendra1jagtap@gmail.com', 'pranavlohit@gmail.com'];
    let primaryAdmin = null;
    
    for (const email of adminEmails) {
      let admin = await User.findOne({ email });
      if (!admin) {
        admin = await User.create({
          name: email.split('@')[0],
          email,
          password: '2203',
          role: 'admin',
          phone: '+91 0000000000'
        });
        console.log(`✅ Admin user created: ${email}`);
      } else {
        // Force update password for existing admin
        admin.password = '2203';
        await admin.save();
        console.log(`✅ Admin user password updated for: ${email}`);
      }
      if (!primaryAdmin) primaryAdmin = admin;
    }

    // Create sample restaurant
    const count = await Restaurant.countDocuments();
    if (count === 0) {
      const rest1 = await Restaurant.create({
        ownerId: primaryAdmin._id,
        name: 'Burger Palace',
        description: 'Best burgers in town',
        cuisine: ['Burgers', 'American', 'Fast Food'],
        address: 'Shop 5, MG Road, Pune, Maharashtra 411001',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        deliveryTime: '20-30 min',
        rating: 4.5,
        priceRange: '₹₹',
        minOrder: 99,
        isActive: true
      });

      await MenuItem.create([
        { restaurantId: rest1._id, name: 'Classic Burger', price: 149, isVeg: false, category: 'Burgers', description: 'Juicy beef patty with fresh veggies' },
        { restaurantId: rest1._id, name: 'Veg Burger', price: 129, isVeg: true, category: 'Burgers', description: 'Crispy veg patty with special sauce' },
        { restaurantId: rest1._id, name: 'Loaded Fries', price: 89, isVeg: true, category: 'Sides', description: 'Golden fries with cheese and jalapeños' },
        { restaurantId: rest1._id, name: 'Milkshake', price: 99, isVeg: true, category: 'Drinks', description: 'Thick and creamy shake' },
      ]);

      const rest2 = await Restaurant.create({
        ownerId: primaryAdmin._id,
        name: 'Spice Garden',
        description: 'Authentic Indian flavours',
        cuisine: ['Indian', 'Biryani'],
        address: 'Plot 12, FC Road, Pune, Maharashtra 411016',
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
        deliveryTime: '30-40 min',
        rating: 4.3,
        priceRange: '₹₹',
        minOrder: 150,
        isActive: true
      });

      await MenuItem.create([
        { restaurantId: rest2._id, name: 'Chicken Biryani', price: 249, isVeg: false, category: 'Biryani', description: 'Aromatic basmati rice with tender chicken' },
        { restaurantId: rest2._id, name: 'Veg Biryani', price: 199, isVeg: true, category: 'Biryani', description: 'Fragrant rice with mixed vegetables' },
        { restaurantId: rest2._id, name: 'Butter Naan', price: 49, isVeg: true, category: 'Breads', description: 'Soft tandoor naan with butter' },
        { restaurantId: rest2._id, name: 'Dal Makhani', price: 149, isVeg: true, category: 'Main Course', description: 'Creamy black lentils slow cooked overnight' },
      ]);

      console.log('✅ Sample restaurants and menus seeded');
    }

    // Seed coupons
    const couponCount = await Coupon.countDocuments();
    if (couponCount === 0) {
      await Coupon.create([
        { code: 'WELCOME20', discountType: 'percentage', discountValue: 20, minOrderValue: 200, maxDiscount: 100, isActive: true },
        { code: 'FLAT50', discountType: 'flat', discountValue: 50, minOrderValue: 300, isActive: true },
        { code: 'SAVE10', discountType: 'percentage', discountValue: 10, minOrderValue: 100, maxDiscount: 50, isActive: true },
      ]);
      console.log('✅ Coupons seeded: WELCOME20, FLAT50, SAVE10');
    }
  } catch (err) {
    console.warn('Seeding error (non-fatal):', err.message);
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
