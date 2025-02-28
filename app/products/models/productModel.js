const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    description: String,
    price: Number,
    salePrice: Number,
    totalStock: Number,
    category: String,
    manufacturer: String,
    material: String,
    averageReview: { type: Number, min: 1, max: 5 },
    quantityReview: Number,
    images: [String],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
