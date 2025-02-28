const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
} = require('../controllers/productController'); // Import controller

router.get('/', getAllProducts);
router.get('/:idWithName', getProductById);

module.exports = router;
