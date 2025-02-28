const productService = require('../../products/services/productService');
exports.getProductsAPI = async (req, res) => {
  try {
    const filters = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;

    const { products, totalPages } = await productService.getProducts(
      filters,
      page,
      limit
    );

    res.json({ products, totalPages, currentPage: page });
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).json({ message: 'Error retrieving products' });
  }
};
