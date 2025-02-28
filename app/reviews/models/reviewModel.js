const moongse = require('mongoose');

const reviewSchemna = new moongse.Schema(
  {
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true, trim: true },
    userId: {
      type: moongse.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: moongse.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    images: { type: [String] },
  },
  {
    timestamps: true,
  }
);

module.exports = moongse.model('Review', reviewSchemna);
