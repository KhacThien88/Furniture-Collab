const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }, // Giá tại thời điểm mua
    },
  ],
  totalAmount: { type: Number, required: true },
  address: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    country: { type: String, default: 'Vietnam' },
    zipCode: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  payment: {
    method: {
      type: String,
      enum: ['Momo', 'VNPay', 'PayPal', 'Stripe'],
      required: true,
    },
    transactionId: { type: String },
    date: { type: Date, required: true },
  },
  orderDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered'],
    default: 'Pending',
  },
});

module.exports = mongoose.model('Order', OrderSchema);
