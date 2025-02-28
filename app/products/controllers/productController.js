const productService = require('../services/productService'); // Service xử lý logic về sản phẩm
const categoryService = require('../../category/services/categoryService');
const manufacturerService = require('../../manufacturer/services/manufacturerService');
const reviewService = require('../../reviews/services/reviewService');
const getAllProducts = async (req, res, next) => {
  try {
    // Lấy các filter và phân trang từ query
    const filters = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;

    // Gọi productService để lấy dữ liệu sản phẩm
    const { products, totalPages } = await productService.getProducts(
      filters,
      page,
      limit
    );

    const categories = await categoryService.getAllCategoryNames();
    const manufacturers = await manufacturerService.getAllManufacturerNames();
    // Render lại view với dữ liệu sản phẩm và filter
    res.render('shop/shop', {
      products,
      filters, // Truyền filters vào để render lại trạng thái filter
      totalPages,
      categories,
      manufacturers,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error retrieving products:', error);
    next(error);
  }
};

// Lấy thông tin sản phẩm theo ID
const getProductById = async (req, res) => {
  try {
    const idWithName = req.params.idWithName;

    // Tách ID và Name từ URL
    const [id, ...nameParts] = idWithName.split('-');
    const name = nameParts.join('-'); // Gộp lại phần tên

    // Lấy sản phẩm theo ID
    const product = await productService.getProductById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // So sánh name từ URL với tên sản phẩm thực tế
    const expectedName = product.name.replace(/\s+/g, '-').toLowerCase();
    if (name.toLowerCase() !== expectedName) {
      // Redirect đến URL chuẩn nếu không khớp
      return res.redirect(`/shop/${id}-${expectedName}`);
    }

    // Pagination logic for reviews
    const reviewsPerPage = 2;
    const currentPage = parseInt(req.query.page) || 1; // Get the current page from the query params, default is 1

    // Gọi dịch vụ để lấy reviews với phân trang
    const { reviews, totalPages } = await reviewService.getAllReviewsOfProduct(
      id,
      currentPage, // Trang hiện tại
      reviewsPerPage // Số lượng reviews mỗi trang
    );

    // Lấy các sản phẩm khác để hiển thị (nếu cần)
    const { products } = await productService.getProducts();

    // Render the page, passing currentPage and totalPages
    res.render('shop/shopDetail', {
      product,
      products,
      reviews,
      currentPage,
      totalPages, // Truyền totalPages vào view để hiển thị phân trang
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
};
