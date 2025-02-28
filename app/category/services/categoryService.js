const Category = require('../model/categoryModel');
exports.getAllCategoryNames = async () => {
  const categories = await Category.find({}, 'name').lean();
  return categories.map((category) => category.name);
};
