const express = require('express');
const router = express.Router();

const apiReviewControllers = require('../reviews/apiReviewControllers');

router.get('/product/:productId', apiReviewControllers.getReviewsAPI);

module.exports = router;
