const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Review = require('../models/Review');

// GET /api/restaurants - get all active restaurants (or ALL for admin)
exports.getAllRestaurants = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const filter = isAdmin ? {} : { isActive: true };
    const restaurants = await Restaurant.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/restaurants/nearby - geospatial query
exports.getNearbyRestaurants = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 5000, cuisine } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: 'Longitude and Latitude are required' });
    }

    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      isActive: true
    };

    if (cuisine) {
      query.cuisine = { $in: [cuisine] };
    }

    const restaurants = await Restaurant.find(query).limit(20);
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/restaurants/:id - get restaurant + its menu items + reviews
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const menuItems = await MenuItem.find({ restaurantId: req.params.id });
    const reviews = await Review.find({ restaurantId: req.params.id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    res.json({ restaurant, menuItems, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRestaurant = async (req, res) => {
  try {
    // Allow both admin and restaurant_partner to create restaurants
    if (req.user.role !== 'restaurant_partner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin or Partner role required' });
    }
    
    const { name, description, cuisine, location, address, image, deliveryTime, rating, priceRange, minOrder, tags } = req.body;
    
    const restaurant = await Restaurant.create({
      ownerId: req.user._id,
      name,
      description: description || '',
      cuisine: cuisine ? (Array.isArray(cuisine) ? cuisine : [cuisine]) : [],
      location: location || { type: 'Point', coordinates: [0, 0] },
      address: address || '',
      image: image || '',
      deliveryTime: deliveryTime || '30-45 min',
      rating: rating ? parseFloat(rating) : 4.0,
      priceRange: priceRange || '₹₹',
      minOrder: minOrder ? parseInt(minOrder) : 0,
      tags: tags || [],
      isActive: true
    });
    
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addMenuItem = async (req, res) => {
  try {
    if (req.user.role !== 'restaurant_partner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    if (req.user.role !== 'admin' && restaurant.ownerId.toString() !== req.user._id.toString()) {
       return res.status(403).json({ message: 'Not your restaurant' });
    }

    const { name, description, price, imageUrl, image, isVeg, isAvailable, category } = req.body;
    const menuItem = await MenuItem.create({
      restaurantId: req.params.id,
      name,
      description: description || '',
      price: parseFloat(price) || 0,
      imageUrl: imageUrl || image || '',
      isVeg: isVeg === true || isVeg === 'true',
      isAvailable: isAvailable !== false,
      category: category || 'Main Course'
    });
    // Return menuItem directly (frontend Admin.jsx expects this)
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    if (req.user.role !== 'admin' && restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description, cuisine, address, location, isActive,
            image, deliveryTime, rating, priceRange, minOrder, tags } = req.body;

    if (name)        restaurant.name = name;
    if (description !== undefined) restaurant.description = description;
    if (cuisine)     restaurant.cuisine = Array.isArray(cuisine) ? cuisine : [cuisine];
    if (address)     restaurant.address = address;
    if (location)    restaurant.location = location;
    if (image !== undefined)        restaurant.image = image;
    if (deliveryTime !== undefined) restaurant.deliveryTime = deliveryTime;
    if (rating !== undefined)       restaurant.rating = parseFloat(rating);
    if (priceRange !== undefined)   restaurant.priceRange = priceRange;
    if (minOrder !== undefined)     restaurant.minOrder = parseInt(minOrder);
    if (tags)        restaurant.tags = tags;
    if (isActive !== undefined)     restaurant.isActive = isActive;

    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    if (req.user.role !== 'admin' && restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    restaurant.isActive = false;
    await restaurant.save();
    res.json({ message: 'Restaurant deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const menuItem = await MenuItem.findById(itemId);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    if (req.user.role !== 'admin' && (!restaurant || restaurant.ownerId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description, price, imageUrl, isVeg, isAvailable } = req.body;
    menuItem.name = name || menuItem.name;
    menuItem.description = description || menuItem.description;
    menuItem.price = price !== undefined ? price : menuItem.price;
    menuItem.imageUrl = imageUrl || menuItem.imageUrl;
    if (isVeg !== undefined) menuItem.isVeg = isVeg;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;

    await menuItem.save();
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const menuItem = await MenuItem.findById(itemId);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    if (req.user.role !== 'admin' && (!restaurant || restaurant.ownerId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await MenuItem.findByIdAndDelete(itemId);
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
