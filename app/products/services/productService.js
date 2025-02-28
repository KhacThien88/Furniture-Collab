const Product = require('../models/productModel');
const getProducts = async (filters = {}, page = 1, limit = 6) => {
  try {
    const filterConditions = {};

    // Price Filter (minPrice và maxPrice)
    if (filters.minPrice || filters.maxPrice) {
      const priceConditions = {};
      if (filters.minPrice) {
        priceConditions.$gte = Number(filters.minPrice);
      }
      if (filters.maxPrice) {
        priceConditions.$lte = Number(filters.maxPrice);
      }
      if (Object.keys(priceConditions).length > 0) {
        filterConditions.price = priceConditions;
      }
    }

    // Category Filter
    if (filters.category) {
      filterConditions.category = {
        $in: Array.isArray(filters.category)
          ? filters.category
          : [filters.category],
      };
    }

    // Manufacturer Filter
    if (filters.manufacturer) {
      filterConditions.manufacturer = {
        $in: Array.isArray(filters.manufacturer)
          ? filters.manufacturer
          : [filters.manufacturer],
      };
    }

    // Material Filter
    if (filters.material) {
      filterConditions.material = {
        $in: Array.isArray(filters.material)
          ? filters.material
          : [filters.material],
      };
    }

    // Search Keyword (nếu có)
    if (filters.search) {
      filterConditions.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Sorting (tùy theo filter)
    let sortQuery = {};
    if (filters.sort === 'price-asc') {
      sortQuery = { price: 1 };
    } else if (filters.sort === 'price-desc') {
      sortQuery = { price: -1 };
    } else if (filters.sort === 'name-asc') {
      sortQuery = { name: 1 };
    } else if (filters.sort === 'name-desc') {
      sortQuery = { name: -1 };
    } else if (filters.sort === 'createdAt-asc') {
      sortQuery = { createdAt: 1 }; // Old to new
    } else if (filters.sort === 'createdAt-desc') {
      sortQuery = { createdAt: -1 }; // New to old
    }

    // Pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(filterConditions)
      .skip(skip)
      .limit(limit)
      .sort(sortQuery);

    const totalProducts = await Product.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalProducts / limit);

    return { products, totalPages };
  } catch (error) {
    console.error(error);
    throw new Error('Error retrieving products');
  }
};

const getProductById = async (id) => {
  return await Product.findById(id);
};

module.exports = {
  getProducts,
  getProductById,
};
