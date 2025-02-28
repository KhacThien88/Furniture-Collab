const Cart = require('../models/cartModel');
const productService = require('../../products/services/productService');
// Add a new item to the cart (if not already in the cart).
async function addCartItem(userId, productId, quantity) {
  console.log('object helu');
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  // Check if the item already exists in the cart
  const existingItem = await Cart.findOne({ userId, productId });
  const product = await productService.getProductById(productId);

  if (existingItem) {
    // Update the quantity of the existing item
    existingItem.quantity += quantity; // Increase the quantity

    if (existingItem.quantity > product.totalStock) {
      // Thông báo cho người dùng rằng số lượng vượt quá kho hàng
      return {
        error: `You can only purchase up to ${product.totalStock} items.`,
      };
    }

    await existingItem.save(); // Save the updated item
    return existingItem; // Return the updated item
  } else {
    // Add the new item to the cart
    const newCartItem = new Cart({
      userId,
      productId,
      quantity,
    });

    await newCartItem.save(); // Save the new item
    return newCartItem; // Return the new item
  }
}

//Update the quantity of a cart item for a specific user
async function updateCartItemQuantity(userId, productId, quantity) {
  // Validate the input quantity
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  const product = await productService.getProductById(productId);

  if (quantity > product.totalStock) {
    return {
      error: `You can only purchase up to ${product.totalStock} items.`,
    };
  }

  // Find the cart item and update the quantity
  const updatedCartItem = await Cart.findOneAndUpdate(
    { userId, productId },
    { $set: { quantity } }, // Update the quantity field
    { new: true } // Return the updated document
  );

  // If no item is found, return null
  if (!updatedCartItem) {
    throw new Error('Cart item not found');
  }

  return updatedCartItem;
}

/**
 * Delete a single cart item
 */
async function deleteCartItem(userId, productId) {
  const result = await Cart.findOneAndDelete({ userId, productId });
  return result;
}

/**
 * Delete all items in the cart
 */
async function deleteAllCartItems(userId) {
  await Cart.deleteMany({ userId });
}

async function getCartByUserId(userId) {
  return await Cart.find({ userId })
    .populate('productId') // Populate product details
    .lean();
}

async function calculateCartTotals(userId) {
  const cartItems = await Cart.find({ userId }).populate('productId');

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce((sum, item) => {
    const price = item.productId.salePrice || item.productId.price;
    return sum + price * item.quantity;
  }, 0);

  return { cartItems, totalQuantity, totalAmount };
}

module.exports = {
  addCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  deleteAllCartItems,
  getCartByUserId,
  calculateCartTotals,
};
