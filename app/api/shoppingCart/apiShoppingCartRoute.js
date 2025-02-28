const express = require('express');
const router = express.Router();
const apiShoppingCartController = require('./apiShoppingCartController');

// Add a new item to the cart
router.post('/add', apiShoppingCartController.addCartItem);

// Update quantity of an existing cart item
router.post('/update', apiShoppingCartController.updateCartItem);

// Delete a single cart item
router.delete('/delete/:productId', apiShoppingCartController.deleteCartItem);

// Delete all items in the cart
router.delete('/delete-all', apiShoppingCartController.deleteAllCartItems);

module.exports = router;
