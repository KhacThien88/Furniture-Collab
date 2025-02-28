const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');

const {
  ensureAuthenticated,
} = require('../../../middleware/auth/ensureAuthenticated');

router.get('/checkout', ensureAuthenticated, orderController.checkout);

router.post('/place-order', ensureAuthenticated, orderController.placeOrder);

router.get(
  '/order-success/:orderId',
  ensureAuthenticated,
  orderController.orderSuccess
);

router.get('/order-list', ensureAuthenticated, orderController.getAllOrders);

router.get(
  '/order-details/:orderId',
  ensureAuthenticated,
  orderController.getOrderDetails
);

router.get(
  '/payment-success',
  ensureAuthenticated,
  orderController.handleStripeSuccess
);
module.exports = router;
