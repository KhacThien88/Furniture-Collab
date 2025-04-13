const cartService = require("../../cart/services/cartService");
const productService = require("../../products/services/productService");
const Redis = require("ioredis");
// const redis = new Redis(); //localenv
// const redis = new Redis({ host: "redisdb" }); //docker-env
const redis = new Redis("redis://54.255.49.4:6379");

//Add a new item to the cart
async function addCartItem(req, res) {
  const userId = req.user?._id;
  const { productId, quantity } = req.body;
  const sessionId = req.sessionID;
  console.log("heluuu");
  console.log(req.body);
  console.log(req.user?._id);
  console.log(sessionId);
  try {
    if (userId) {
      const cartItem = await cartService.addCartItem(
        userId,
        productId,
        quantity
      );
      if (cartItem.error) {
        res.status(400).json({ message: cartItem.error });
      } else {
        res.status(200).json({
          message: "Item added to cart successfully",
          cartItem,
        });
      }
    } else {
      // Người dùng chưa đăng nhập -> Cache vào Redis
      const cartKey = `cart:${sessionId}`;
      const existingCart = await redis.get(cartKey);
      let cart = existingCart ? JSON.parse(existingCart) : [];
      const productIndex = cart.findIndex(
        (item) => item.productId === productId
      );

      if (productIndex > -1) {
        cart[productIndex].quantity += quantity;
      } else {
        cart.push({ productId, quantity });
      }

      await redis.set(cartKey, JSON.stringify(cart), "EX", 3600); // TTL 1 giờ
      return res
        .status(200)
        .json({ message: "Item added to cart successfully (cached)" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
async function syncCartAfterLogin(req, res, oldSessionId) {
  const userId = req.user._id; // ID người dùng đã đăng nhập
  console.log("oldSessionId: ", oldSessionId);
  const cartKey = `cart:${oldSessionId}`;

  try {
    const cachedCart = await redis.get(cartKey);
    if (cachedCart) {
      const cartItems = JSON.parse(cachedCart);
      for (const { productId, quantity } of cartItems) {
        await cartService.addCartItem(userId, productId, quantity); // Thêm từng sản phẩm vào giỏ hàng
      }
      // Xoá giỏ hàng cache sau khi đồng bộ
      await redis.del(cartKey);
    }
  } catch (error) {
    console.error("Error syncing cart:", error.message);
  }
}

//Update the quantity of an existing item in the cart
async function updateCartItem(req, res) {
  const userId = req.user?._id;
  const { productId, quantity } = req.body;
  const sessionId = req.sessionID;

  // Validate quantity
  if (!quantity || quantity < 1) {
    return res
      .status(400)
      .json({ message: "Quantity must be a positive number" });
  }

  try {
    let updatedCartItem = null;
    let totalQuantity = 0;
    let totalAmount = 0;

    if (userId) {
      // Người dùng đã đăng nhập: Thao tác với database
      updatedCartItem = await cartService.updateCartItemQuantity(
        userId,
        productId,
        quantity
      );

      if (updatedCartItem.error) {
        console.log(updatedCartItem.error);
        return res.status(400).json({ message: updatedCartItem.error });
      }

      if (!updatedCartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      const product = await productService.getProductById(productId);
      const { totalQuantity: dbTotalQuantity, totalAmount: dbTotalAmount } =
        await cartService.calculateCartTotals(userId);

      totalQuantity = dbTotalQuantity;
      totalAmount = dbTotalAmount;

      res.status(200).json({
        message: "Cart item quantity updated successfully",
        updatedCartItem: {
          price: (product.salePrice || product.price) * quantity,
          quantity,
        },
        totalQuantity,
        totalAmount,
      });
    } else {
      // Người dùng chưa đăng nhập: Thao tác với Redis
      const cartKey = `cart:${sessionId}`;
      const existingCart = await redis.get(cartKey);
      let cart = existingCart ? JSON.parse(existingCart) : [];
      const productIndex = cart.findIndex(
        (item) => item.productId === productId
      );

      if (productIndex > -1) {
        // Cập nhật số lượng sản phẩm
        cart[productIndex].quantity = quantity;
        await redis.set(cartKey, JSON.stringify(cart), "EX", 3600);
      } else {
        return res.status(404).json({ message: "Cart item not found" });
      }

      // Lấy thông tin chi tiết sản phẩm và tính toán tổng giá trị
      const product = await productService.getProductById(productId);
      const cartItems = await Promise.all(
        cart.map(async (item) => {
          const productDetails = await productService.getProductById(
            item.productId
          );
          return {
            productId: item.productId,
            price: productDetails.salePrice || productDetails.price,
            quantity: item.quantity,
          };
        })
      );

      totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      totalAmount = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      res.status(200).json({
        message: "Cart item quantity updated successfully",
        updatedCartItem: {
          price: (product.salePrice || product.price) * quantity,
          quantity,
        },
        totalQuantity,
        totalAmount,
      });
    }
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({ message: "Failed to update cart item" });
  }
}

//Delete a single item from the cart
async function deleteCartItem(req, res) {
  const userId = req.user?._id; // Lấy userId nếu có
  const { productId } = req.params;
  const sessionId = req.sessionID; // Lấy sessionId nếu người dùng chưa đăng nhập

  try {
    let cartItems = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    if (userId) {
      // Người dùng đã đăng nhập - thao tác với database
      const deletedItem = await cartService.deleteCartItem(userId, productId);

      if (!deletedItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      // Recalculate totals after item deletion
      const {
        cartItems: dbCartItems,
        totalQuantity: dbTotalQuantity,
        totalAmount: dbTotalAmount,
      } = await cartService.calculateCartTotals(userId);

      cartItems = dbCartItems;
      totalQuantity = dbTotalQuantity;
      totalAmount = dbTotalAmount;
    } else {
      // Người dùng chưa đăng nhập - thao tác với Redis
      const cartKey = `cart:${sessionId}`;
      console.log("cartKey=" + cartKey);
      const existingCart = await redis.get(cartKey);

      if (!existingCart) {
        return res.status(404).json({ message: "No cart found" });
      }

      let cart = JSON.parse(existingCart);
      const productIndex = cart.findIndex(
        (item) => item.productId === productId
      );

      if (productIndex === -1) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      // Xóa sản phẩm khỏi giỏ hàng
      cart.splice(productIndex, 1);

      // Cập nhật lại giỏ hàng vào Redis với TTL 1 giờ
      await redis.set(cartKey, JSON.stringify(cart), "EX", 3600);

      // Tính lại tổng số lượng và tổng giá trị giỏ hàng
      const cartItemsDetails = await Promise.all(
        cart.map(async (item) => {
          const productDetails = await productService.getProductById(
            item.productId
          );
          totalQuantity += item.quantity;
          totalAmount +=
            (productDetails.salePrice || productDetails.price) * item.quantity;
          return {
            productId: productDetails,
            quantity: item.quantity,
          };
        })
      );

      cartItems = cartItemsDetails;
    }

    // Trả về kết quả đồng nhất cho cả hai trường hợp
    res.status(200).json({
      message: "Cart item deleted successfully",
      cartItems,
      totalQuantity,
      totalAmount,
    });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    res.status(500).json({ message: "Failed to delete cart item" });
  }
}

//Delete all items in the cart
async function deleteAllCartItems(req, res) {
  const userId = req.user?._id;
  const sessionId = req.sessionID;

  try {
    if (userId) {
      // Người dùng đã đăng nhập
      await cartService.deleteAllCartItems(userId);

      // Tính toán lại tổng số lượng và tổng giá trị giỏ hàng
      const { cartItems, totalQuantity, totalAmount } =
        await cartService.calculateCartTotals(userId);

      return res.status(200).json({
        message: "All cart items deleted successfully",
        cartItems,
        totalQuantity,
        totalAmount,
      });
    } else {
      // Người dùng chưa đăng nhập (dùng Redis)
      const cartKey = `cart:${sessionId}`;

      // Xóa giỏ hàng trong Redis
      await redis.del(cartKey);

      // Tính toán lại tổng số lượng và tổng giá trị giỏ hàng (giỏ hàng trống)
      const cartItems = [];
      const totalQuantity = 0;
      const totalAmount = 0;

      return res.status(200).json({
        message: "All cart items deleted successfully (cached)",
        cartItems,
        totalQuantity,
        totalAmount,
      });
    }
  } catch (error) {
    console.error("Error deleting all cart items:", error);
    res.status(400).json({ message: error.message });
  }
}

module.exports = {
  addCartItem,
  updateCartItem,
  deleteCartItem,
  deleteAllCartItems,
  syncCartAfterLogin,
};
