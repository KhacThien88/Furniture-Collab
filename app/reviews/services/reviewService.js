const Review = require('../models/reviewModel');

exports.getAllReviewsOfProduct = async (productId, page, limit = 2) => {
  try {
    const query = { productId };
    // Tính toán phân trang
    const skip = (page - 1) * limit;
    const totalReviews = await Review.countDocuments(query); // Tổng số đánh giá
    const totalPages = Math.ceil(totalReviews / limit);

    // Lấy danh sách đánh giá với phân trang
    const reviews = await Review.find(query)
      .populate('userId', 'username avatarUrl')
      .sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
      .skip(skip)
      .limit(limit);

    return { reviews, totalPages };
  } catch (err) {
    throw new Error(err.message);
  }
};

exports.createReview = async (userId, productId, rating, comment, images) => {
  try {
    const review = new Review({
      userId,
      productId,
      rating,
      comment,
      images,
    });

    await review.save();
    return review;
  } catch (error) {
    throw new Error('Error creating review: ' + error.message);
  }
};
