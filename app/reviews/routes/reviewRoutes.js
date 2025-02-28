const express = require('express');

const router = express.Router();
const { createReview } = require('../controllers/reviewController');
const {
  ensureAuthenticated,
} = require('../../../middleware/auth/ensureAuthenticated');

router.post('/create/:productId', ensureAuthenticated, createReview);

module.exports = router;
