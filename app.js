const express = require('express');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const Product = require('./app/products/models/productModel'); // Import model Product
const User = require('./app/users/models/userModel');
const Review = require('./app/reviews/models/reviewModel');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const homeRoute = require('./app/home/homeRoute');
const shopRoutes = require('./app/products/routes/productRoutes');
const userRoutes = require('./app/users/routes/userRoutes');
const apiShoppingCartRoute = require('./app/api/shoppingCart/apiShoppingCartRoute');
const apiProductRoutes = require('./app/api/products/apiProductRoutes');
const cartRoute = require('./app/cart/routes/cartRoute');
const orderRoutes = require('./app/order/routes/orderRoutes');
const reviewRoute = require('./app/reviews/routes/reviewRoutes');
const apiReviewRoutes = require('./app/api/reviews/apiReviewRoutes');
const logger = require('./log/logger');

const session = require('express-session');
const passport = require('passport');
require('./library/passport-config')(passport); // Import Passport config

const app = express();
app.use(expressLayouts);
app.use(express.static(path.join(__dirname, 'public')));

// Set default layout
app.set('layout', './layouts/main');

// Cấu hình EJS
app.set('view engine', 'ejs'); // Sử dụng EJS làm template engine
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Kết nối MongoDB và thêm dữ liệu mẫu
connectDB()
  .then(async () => {
    try {
      // Thêm dữ liệu để test
      const countProduct = await Product.countDocuments({});
      if (countProduct === 0) {
        const data = JSON.parse(
          fs.readFileSync('./data/products.json', 'utf-8')
        );
        await Product.insertMany(data);
        console.log('Sample products data inserted');
      }

      const countUser = await User.countDocuments({});
      if (countUser === 0) {
        const data = JSON.parse(fs.readFileSync('./data/users.json', 'utf-8'));
        await User.insertMany(data);
        console.log('Sample users data inserted');
      }

      // Kiểm tra xem có dữ liệu review nào chưa
      const countReview = await Review.countDocuments({});
      if (countReview === 0) {
        // Đọc dữ liệu từ file reviews.json
        const reviewData = JSON.parse(
          fs.readFileSync('./data/reviews.json', 'utf-8')
        );

        // Chèn dữ liệu vào cơ sở dữ liệu MongoDB
        await Review.insertMany(reviewData);
        console.log('Sample reviews data inserted');
      }
    } catch (err) {
      console.error('Error inserting sample data:', err);
    }
  })
  .catch((error) => console.error('MongoDB connection error:', error));

// Cấu hình session
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Đặt thành `true` nếu dùng HTTPS
      maxAge: 3600000, // Thời gian tồn tại cookie (1 giờ)
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use('/api/cart', apiShoppingCartRoute);
app.use('/api/products', apiProductRoutes);
app.use('/cart', cartRoute);
app.use('/', homeRoute);
app.use('/shop', shopRoutes);
app.use('/', userRoutes);
app.use('/', orderRoutes);
app.use('/review', reviewRoute);
app.use('/api/reviews', apiReviewRoutes);

app.get('/about', (req, res) => {
  res.render('about/about', {
    coreValues: [
      {
        title: 'Quality Craftsmanship',
        description:
          'Each piece is carefully crafted by skilled artisans using premium materials.',
      },
      {
        title: 'Timeless Designs',
        description: 'Our furniture blends classic styles with a modern touch.',
      },
      {
        title: 'Sustainable Sourcing',
        description:
          'We source responsibly, with an emphasis on eco-friendly practices.',
      },
    ],
    mission:
      'Our mission is to provide our customers with exceptional furniture pieces that not only elevate their homes but also reflect their personal styles. We strive to offer unique, high-quality products that are both affordable and sustainable.',
    testimonials: [
      {
        quote:
          "I bought a dining table from this shop and couldn't be happier! Excellent quality and beautiful design.",
        author: 'Jane D.',
      },
      {
        quote:
          'Great customer service and a fantastic range of furniture. I highly recommend!',
        author: 'Mark S.',
      },
      {
        quote:
          'The furniture I bought exceeded my expectations. Eco-friendly and stylish!',
        author: 'Sarah L.',
      },
    ],
    teamMembers: [
      {
        name: 'John Doe',
        role: 'Founder & Designer',
        image: '/img/TeamMembers/Member1.jpg',
      },
      {
        name: 'Jane Smith',
        role: 'Head of Sales',
        image: '/img/TeamMembers/Member2.jpg',
      },
      {
        name: 'Emily Brown',
        role: 'Customer Support',
        image: '/img/TeamMembers/Member3.jpg',
      },
    ],
  });
});

app.get('/contact', (req, res) => {
  res.render('contact/contact', { formActionUrl: '/submit-contact-form' });
});
module.exports = app;
