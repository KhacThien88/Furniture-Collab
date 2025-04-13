const cartService = require("../services/cartService");
const productService = require("../../products/services/productService");
const Redis = require("ioredis");
// const redis = new Redis();
// const redis = new Redis({ host: "redisdb" }); //docker-env
const redis = new Redis("redis://52.221.227.81:6379");

exports.getAllCart = async (req, res) => {
  const userId = req.user?._id; // Kiểm tra người dùng đã đăng nhập
  const sessionId = req.sessionID;
  console.log("sessionId in render=" + sessionId);
  console.log("userId", userId);

  try {
    let cartItems = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    if (userId) {
      // Người dùng đã đăng nhập: Lấy giỏ hàng từ database
      cartItems = await cartService.getCartByUserId(userId);

      // Kiểm tra nếu giỏ hàng trống
      if (cartItems.length === 0) {
        return res.render("cart/cart", {
          cartItems,
          totalQuantity: 0,
          totalAmount: 0,
          cartEmpty: true,
        });
      }

      // Tính tổng số lượng và tổng tiền
      totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      totalAmount = cartItems.reduce(
        (sum, item) =>
          sum +
          item.quantity * (item.productId.salePrice || item.productId.price),
        0
      );
    } else {
      // Người dùng chưa đăng nhập: Lấy giỏ hàng từ Redis
      const cartKey = `cart:${sessionId}`;
      const existingCart = await redis.get(cartKey);

      if (existingCart) {
        const cachedCart = JSON.parse(existingCart);

        // Lấy thông tin chi tiết sản phẩm từ database và tính toán tổng số lượng, tổng tiền
        cartItems = await Promise.all(
          cachedCart.map(async (item) => {
            const product = await productService.getProductById(item.productId);
            return {
              productId: product, // Gắn thông tin chi tiết sản phẩm
              quantity: item.quantity,
            };
          })
        );

        totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        totalAmount = cartItems.reduce(
          (sum, item) =>
            sum +
            item.quantity * (item.productId.salePrice || item.productId.price),
          0
        );
      }
    }

    // Render giỏ hàng
    res.render("cart/cart", {
      cartItems,
      totalQuantity,
      totalAmount,
      cartEmpty: cartItems.length === 0,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).send("Error fetching cart");
  }
};
