// mockData.js — static data used when backend/DB is unavailable

export const MOCK_RESTAURANTS = [
  {
    _id: 'rest_001',
    name: 'Burger Palace',
    description: 'The finest gourmet burgers in town, crafted with premium ingredients and love.',
    cuisine: ['Burgers', 'American', 'Fast Food'],
    address: 'Shop 5, MG Road, Pune, Maharashtra 411001',
    averageRating: 4.5,
    totalReviews: 128,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=2070&auto=format&fit=crop',
    deliveryTime: '25-35 min',
    minOrder: 99
  },
  {
    _id: 'rest_002',
    name: 'Pizza Fiesta',
    description: 'Authentic wood-fired pizzas with fresh toppings, baked to perfection.',
    cuisine: ['Pizza', 'Italian'],
    address: 'FC Road, Shivajinagar, Pune - 411004',
    averageRating: 4.3,
    totalReviews: 94,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=2081&auto=format&fit=crop',
    deliveryTime: '30-40 min',
    minOrder: 149
  },
  {
    _id: 'rest_003',
    name: 'Spice Garden',
    description: 'Rich, aromatic Indian curries and biryanis made with traditional recipes.',
    cuisine: ['Indian', 'Biryani', 'Curry'],
    address: 'Camp Area, Pune - 411001',
    averageRating: 4.7,
    totalReviews: 210,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=2036&auto=format&fit=crop',
    deliveryTime: '35-45 min',
    minOrder: 199
  }
];

export const MOCK_MENU = {
  rest_001: [
    {
      _id: 'item_001',
      restaurantId: 'rest_001',
      name: 'Classic Beef Burger',
      description: 'Juicy 200g beef patty with lettuce, tomato, cheese & special sauce in a brioche bun',
      price: 249,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Bestseller'
    },
    {
      _id: 'item_002',
      restaurantId: 'rest_001',
      name: 'Crispy Chicken Burger',
      description: 'Golden fried chicken fillet with coleslaw, pickles & sriracha mayo in a toasted bun',
      price: 199,
      imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Popular'
    },
    {
      _id: 'item_003',
      restaurantId: 'rest_001',
      name: 'Loaded Cheese Fries',
      description: 'Thick-cut golden fries smothered in melted cheddar, jalapeños & sour cream',
      price: 129,
      imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: null
    },
    {
      _id: 'item_004',
      restaurantId: 'rest_001',
      name: 'Oreo Milkshake',
      description: 'Thick & creamy blended Oreo milkshake topped with whipped cream & crushed cookies',
      price: 149,
      imageUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Must Try'
    }
  ],
  rest_002: [
    {
      _id: 'item_005',
      restaurantId: 'rest_002',
      name: 'Margherita Pizza',
      description: 'Classic tomato base, fresh mozzarella, basil leaves, drizzled with olive oil',
      price: 299,
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Classic'
    },
    {
      _id: 'item_006',
      restaurantId: 'rest_002',
      name: 'BBQ Chicken Pizza',
      description: 'Smoky BBQ sauce, grilled chicken, red onions, bell peppers & mozzarella',
      price: 349,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Bestseller'
    },
    {
      _id: 'item_007',
      restaurantId: 'rest_002',
      name: 'Garlic Bread',
      description: 'Toasted ciabatta with garlic butter and herbs, served with marinara dip',
      price: 99,
      imageUrl: 'https://images.unsplash.com/photo-1619531040576-f9416740661f?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: null
    },
    {
      _id: 'item_008',
      restaurantId: 'rest_002',
      name: 'Tiramisu',
      description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream',
      price: 179,
      imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Must Try'
    }
  ],
  rest_003: [
    {
      _id: 'item_009',
      restaurantId: 'rest_003',
      name: 'Chicken Biryani',
      description: 'Fragrant basmati rice cooked with tender chicken pieces, saffron & whole spices',
      price: 279,
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d0a7?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Bestseller'
    },
    {
      _id: 'item_010',
      restaurantId: 'rest_003',
      name: 'Butter Chicken',
      description: 'Tender chicken in rich tomato-cream gravy with aromatic spices. Served with naan.',
      price: 249,
      imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Popular'
    },
    {
      _id: 'item_011',
      restaurantId: 'rest_003',
      name: 'Paneer Tikka',
      description: 'Marinated cottage cheese cubes grilled in tandoor with peppers & onions',
      price: 219,
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: 'Veg'
    },
    {
      _id: 'item_012',
      restaurantId: 'rest_003',
      name: 'Gulab Jamun',
      description: 'Soft milk-solid dumplings soaked in rose-flavored sugar syrup. Served warm.',
      price: 89,
      imageUrl: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=800&auto=format&fit=crop',
      isAvailable: true,
      tag: null
    }
  ]
};
