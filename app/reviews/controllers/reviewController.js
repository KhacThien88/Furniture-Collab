const reviewService = require('../services/reviewService');

exports.createReview = async (req, res) => {
  try {
    console.log(req.body);
    const { rating, comment } = req.body;
    const { productId } = req.params;
    const userId = req.user.id;
    console.log('rating: ' + rating + ' comment: ' + comment);
    console.log('userId: ' + userId);
    console.log('productId: ' + productId);
    if (!rating || !comment) {
      return res
        .status(400)
        .json({ message: 'Rating and comment are required' });
    }
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: 'Rating must be between 1 and 5' });
    }

    // Extract images from the uploaded file(s)
    let images = [];
    if (req.files) {
      images = req.files.map((file) => file.path); // or file.url if using cloud storage
    } else if (req.file) {
      images = [req.file.path]; // Single file upload
    }

    // Call service layer function
    const review = await reviewService.createReview(
      userId,
      productId,
      rating,
      comment,
      images
    );

    res.status(201).json({ success: 'Review created successfully', review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
