const reviewService = require('../../reviews/services/reviewService');
exports.getReviewsAPI = async (req, res) => {
  try {
    const productId = req.params.productId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    const { reviews, totalPages } = await reviewService.getAllReviewsOfProduct(
      productId,
      page,
      limit
    );
    res.json({ reviews, totalPages, currentPage: page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};
