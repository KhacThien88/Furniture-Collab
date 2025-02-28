// controllers/orderController.js
const orderService = require('../services/orderService');
const Cart = require('../../cart/models/cartModel');
const User = require('../../users/models/userModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.checkout = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy thông tin user nếu có

    // Lấy các sản phẩm trong giỏ hàng
    const cartItems = await Cart.find({ userId }).populate('productId');

    const user = await User.findById(userId);

    if (!cartItems || cartItems.length === 0) {
      return res.redirect('/cart'); // Nếu giỏ hàng trống, chuyển hướng về giỏ hàng
    }

    let totalAmount = 0;
    let totalQuantity = 0;

    const items = cartItems.map((item) => {
      const product = item.productId;
      const price = product.salePrice || product.price; // Giá của sản phẩm
      const quantity = item.quantity;
      totalAmount += price * quantity;
      totalQuantity += quantity; // Cộng dồn số lượng

      return {
        name: product.name,
        productId: product._id,
        quantity,
        price,
      };
    });

    // Render trang checkout với dữ liệu giỏ hàng
    res.render('checkout/checkout', {
      user,
      items,
      totalAmount,
      totalQuantity,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong!');
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const { address, paymentMethod } = req.body;
    const userId = req.user._id;

    // Delegate order placement logic to the service
    const sessionUrl = await orderService.processPayment({
      userId,
      address,
      paymentMethod,
    });

    // Respond with the Stripe session URL
    res.json({ url: sessionUrl });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ message: 'Failed to place order.' });
  }
};

exports.handleStripeSuccess = async (req, res) => {
  try {
    const userId = req.user._id;
    // Lấy session_id từ query
    const session = await stripe.checkout.sessions.retrieve(
      req.query.session_id
    );

    // Lấy metadata từ phiên Stripe
    const address = JSON.parse(session.metadata.address);

    // Lưu order vào cơ sở dữ liệu
    const newOrder = await orderService.createOrder(
      userId,
      'Stripe',
      address,
      session.id // Stripe session ID
    );

    // Chuyển hướng người dùng đến trang thành công
    res.redirect(`/order-success/${newOrder._id}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
    res.status(500).send('An error occurred while processing the payment.');
  }
};

exports.orderSuccess = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Render trang thành công và gửi thông tin đơn hàng
    res.render('order/order-success', {
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong!');
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy thông tin user nếu có
    const orders = await orderService.getAllOrdersByUserID(userId);
    // Render trang quản lý đơn hàng với dữ liệu đơn hàng
    res.render('order/order-list', {
      orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong!');
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Render trang chi tiết đơn hàng với dữ liệu đơn hàng
    res.render('order/order-details', {
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong!');
  }
};
