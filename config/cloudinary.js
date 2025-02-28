const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.my_cloud_name,
  api_key: process.env.my_key,
  api_secret: process.env.my_secret,
});

module.exports = cloudinary;
