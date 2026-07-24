// seedDYPIU.js — Seeds all 10 DYPIU Nearby Restaurants from Excel
// Run with: node seedDYPIU.js

require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodhub';

// Restaurant metadata (cuisine, description, image, address, etc.)
const restaurantMeta = {
  'Nisarg Hotel Misal Special': {
    cuisine: ['Maharashtrian', 'Street Food', 'Breakfast'],
    description: 'Authentic Pune-style Misal Pav and traditional Maharashtrian breakfast – a local favourite near DYPIU.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '15-25 min',
    rating: 4.3,
    priceRange: '₹',
    minOrder: 50,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7559, 18.6486] }
  },
  'Reminisce Cafe': {
    cuisine: ['Cafe', 'Continental', 'Snacks'],
    description: 'A cozy student-favourite cafe near campus with great burgers, momos, and refreshing cold coffees.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '20-30 min',
    rating: 4.2,
    priceRange: '₹₹',
    minOrder: 100,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7563, 18.6490] }
  },
  "KP'S Cafe": {
    cuisine: ['Cafe', 'Italian', 'Fast Food'],
    description: 'Popular campus cafe known for sandwiches, pasta, and piping hot pizzas at student-friendly prices.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '20-30 min',
    rating: 4.1,
    priceRange: '₹₹',
    minOrder: 100,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7555, 18.6480] }
  },
  'Domo': {
    cuisine: ['Asian', 'Chinese', 'Momos'],
    description: 'Trendy Asian fusion spot serving authentic momos, noodles, and dim sum near DYPIU.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '25-35 min',
    rating: 4.4,
    priceRange: '₹₹',
    minOrder: 120,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7570, 18.6495] }
  },
  'The Heaven Cafe': {
    cuisine: ['Cafe', 'Desserts', 'Beverages'],
    description: 'A heavenly cafe experience with divine desserts, waffles, and specialty coffees loved by students.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '20-30 min',
    rating: 4.5,
    priceRange: '₹₹',
    minOrder: 100,
    image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7548, 18.6475] }
  },
  'Golden Bawarchi': {
    cuisine: ['North Indian', 'Biryani', 'Curry'],
    description: 'Rich, flavourful North Indian cuisine and aromatic biryani served with love near campus.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '30-45 min',
    rating: 4.3,
    priceRange: '₹₹',
    minOrder: 150,
    image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7542, 18.6470] }
  },
  'Arista Fine Dine': {
    cuisine: ['Multi-Cuisine', 'Continental', 'Indian'],
    description: 'An upscale fine dining experience with a curated menu of Indian and Continental delicacies.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '35-50 min',
    rating: 4.6,
    priceRange: '₹₹₹',
    minOrder: 250,
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7535, 18.6465] }
  },
  'Punjabi Treat': {
    cuisine: ['Punjabi', 'North Indian', 'Tandoor'],
    description: 'Hearty Punjabi flavours – from buttery dal makhani to tandoori specialties, right near DYPIU.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '25-40 min',
    rating: 4.2,
    priceRange: '₹₹',
    minOrder: 120,
    image: 'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7580, 18.6500] }
  },
  'Hotel Tilak': {
    cuisine: ['Maharashtrian', 'South Indian', 'Thali'],
    description: 'Classic hotel serving hearty Maharashtrian thalis and South Indian breakfast at pocket-friendly prices.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '20-30 min',
    rating: 4.0,
    priceRange: '₹',
    minOrder: 80,
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7530, 18.6460] }
  },
  'Le Stone': {
    cuisine: ['Cafe', 'Continental', 'Pizzas', 'Pasta'],
    description: 'Chic stone-themed cafe with artisanal pizzas, creamy pastas, and premium coffee blends.',
    address: 'Near D.Y. Patil International University, Akurdi, Pune',
    deliveryTime: '25-40 min',
    rating: 4.4,
    priceRange: '₹₹',
    minOrder: 150,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop',
    location: { type: 'Point', coordinates: [73.7525, 18.6455] }
  }
};

// Menu item images by type/keyword
function getMenuImage(itemName) {
  const n = itemName.toLowerCase();
  if (n.includes('misal')) return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=800&auto=format&fit=crop';
  if (n.includes('pav') || n.includes('bread')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop';
  if (n.includes('burger')) return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop';
  if (n.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop';
  if (n.includes('pasta')) return 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?q=80&w=800&auto=format&fit=crop';
  if (n.includes('sandwich')) return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop';
  if (n.includes('momo') || n.includes('dumpling')) return 'https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=800&auto=format&fit=crop';
  if (n.includes('noodle') || n.includes('chow')) return 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?q=80&w=800&auto=format&fit=crop';
  if (n.includes('biryani')) return 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=800&auto=format&fit=crop';
  if (n.includes('coffee') || n.includes('cafe')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop';
  if (n.includes('tea') || n.includes('chai')) return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=800&auto=format&fit=crop';
  if (n.includes('fries') || n.includes('chips')) return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=800&auto=format&fit=crop';
  if (n.includes('paneer')) return 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?q=80&w=800&auto=format&fit=crop';
  if (n.includes('dal') || n.includes('daal')) return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=800&auto=format&fit=crop';
  if (n.includes('rice') || n.includes('pulao')) return 'https://images.unsplash.com/photo-1536304993881-ff86e0c9a3b5?q=80&w=800&auto=format&fit=crop';
  if (n.includes('roti') || n.includes('naan') || n.includes('chapati')) return 'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?q=80&w=800&auto=format&fit=crop';
  if (n.includes('chicken')) return 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=800&auto=format&fit=crop';
  if (n.includes('dessert') || n.includes('cake') || n.includes('waffle')) return 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800&auto=format&fit=crop';
  if (n.includes('juice') || n.includes('shake') || n.includes('smoothie')) return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop';
  if (n.includes('soup')) return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800&auto=format&fit=crop';
  if (n.includes('taak') || n.includes('buttermilk') || n.includes('lassi')) return 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=800&auto=format&fit=crop';
  // default food image
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop';
}

function guessCategory(itemName) {
  const n = itemName.toLowerCase();
  if (n.includes('tea') || n.includes('coffee') || n.includes('juice') || n.includes('shake') || n.includes('taak') || n.includes('lassi') || n.includes('soda') || n.includes('smoothie')) return 'Beverages';
  if (n.includes('cake') || n.includes('waffle') || n.includes('dessert') || n.includes('ice cream') || n.includes('brownie') || n.includes('gulab')) return 'Desserts';
  if (n.includes('pav') || n.includes('bread') || n.includes('roti') || n.includes('naan') || n.includes('chapati')) return 'Breads';
  if (n.includes('fries') || n.includes('starter') || n.includes('momo') || n.includes('soup') || n.includes('appetizer')) return 'Starters';
  return 'Main Course';
}

async function seedDYPIU() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Read Excel
    const filePath = path.join(__dirname, '../DYPIU_Nearby_Restaurants_Menu.xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Restaurants'];
    const rows = xlsx.utils.sheet_to_json(sheet);

    // Create or reuse a seed owner
    let owner = await User.findOne({ email: 'dypiu.owner@foodhub.com' });
    if (!owner) {
      owner = await User.create({
        name: 'DYPIU Seed Owner',
        email: 'dypiu.owner@foodhub.com',
        password: 'seedpassword123',
        role: 'restaurant_partner'
      });
      console.log('👤 Created seed owner user');
    } else {
      console.log('👤 Using existing seed owner');
    }

    let totalRestaurants = 0;
    let totalMenuItems = 0;

    for (const row of rows) {
      const name = row['Restaurant Name'];
      if (!name) continue;

      const meta = restaurantMeta[name] || {
        cuisine: ['Multi-Cuisine'],
        description: `${name} — a popular restaurant near D.Y. Patil International University, Pune.`,
        address: 'Near D.Y. Patil International University, Akurdi, Pune',
        deliveryTime: '30-45 min',
        rating: 4.0,
        priceRange: '₹₹',
        minOrder: 100,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop',
        location: { type: 'Point', coordinates: [73.7559, 18.6486] }
      };

      // Remove old entry with same name (idempotent)
      await Restaurant.deleteMany({ name });

      const restaurant = await Restaurant.create({
        ownerId: owner._id,
        name,
        description: meta.description,
        cuisine: meta.cuisine,
        location: meta.location,
        address: meta.address,
        image: meta.image,
        deliveryTime: meta.deliveryTime,
        rating: meta.rating,
        priceRange: meta.priceRange,
        minOrder: meta.minOrder,
        averageRating: meta.rating,
        totalReviews: Math.floor(Math.random() * 80) + 20,
        isActive: true
      });

      // Build menu items from up to 5 columns
      const menuItems = [];
      const itemKeys = [
        { name: 'Menu Item 1', price: 'Price',   type: 'Type'   },
        { name: 'Menu Item 2', price: 'Price_1',  type: 'Type_1' },
        { name: 'Menu Item 3', price: 'Price_2',  type: 'Type_2' },
        { name: 'Menu Item 4', price: 'Price_3',  type: 'Type_3' },
        { name: 'Menu Item 5', price: 'Price_4',  type: 'Type_4' },
      ];

      for (const keys of itemKeys) {
        const itemName = row[keys.name];
        const itemPrice = row[keys.price];
        const itemType = row[keys.type] || 'Veg';

        if (itemName && itemPrice) {
          menuItems.push({
            restaurantId: restaurant._id,
            name: itemName,
            description: `Delicious ${itemName} prepared fresh at ${name}.`,
            price: Number(itemPrice),
            imageUrl: getMenuImage(itemName),
            isVeg: itemType.toLowerCase().trim() === 'veg',
            isAvailable: true,
            category: guessCategory(itemName)
          });
        }
      }

      if (menuItems.length > 0) {
        await MenuItem.deleteMany({ restaurantId: restaurant._id });
        await MenuItem.insertMany(menuItems);
      }

      totalRestaurants++;
      totalMenuItems += menuItems.length;
      console.log(`✅ ${name} — ${menuItems.length} menu items added`);
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   Restaurants: ${totalRestaurants}`);
    console.log(`   Menu Items : ${totalMenuItems}`);
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seedDYPIU();
