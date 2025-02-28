const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

CartSchema.index({ userId: 1, productId: 1 }, { unique: true }); // Đảm bảo mỗi sản phẩm chỉ xuất hiện một lần trong giỏ của một người dùng

module.exports = mongoose.model('Cart', CartSchema);
