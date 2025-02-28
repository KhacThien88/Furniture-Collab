const productService = require('../products/services/productService');

const categories = [
  {
    name: 'Sofa',
    image: '/img/Category/images/01.svg',
  },
  {
    name: 'TV Cabinet',
    image: '/img/Category/images/02.svg',
  },
  {
    name: 'Dining',
    image: '/img/Category/images/03.svg',
  },
  {
    name: 'Wordrobe',
    image: '/img/Category/images/04.svg',
  },
  {
    name: 'Bed',
    image: '/img/Category/images/05.svg',
  },
  {
    name: 'Dressing Table',
    image: '/img/Category/images/06.svg',
  },
  {
    name: 'Door',
    image: '/img/Category/images/07.svg',
  },
  {
    name: 'Divan',
    image: '/img/Category/images/08.svg',
  },
  {
    name: 'Office',
    image: '/img/Category/images/09.svg',
  },
  {
    name: 'Kitchen',
    image: '/img/Category/images/10.svg',
  },
  {
    name: 'Lamp',
    image: '/img/Category/images/11.svg',
  },
  {
    name: 'Reading Table',
    image: '/img/Category/images/12.svg',
  },
  {
    name: 'Mattress',
    image: '/img/Category/images/13.svg',
  },
  {
    name: 'Chest Drawers',
    image: '/img/Category/images/14.svg',
  },
  {
    name: 'Windows',
    image: '/img/Category/images/15.svg',
  },
  {
    name: 'Miscellaneous',
    image: '/img/Category/images/16.svg',
  },
];

const heroSlider = [
  {
    id: 1,
    title: 'Discover Our Latest Collection',
    subtitle: 'Elevate Your Living Space with Our New Arrivals',
    image: '/img/Hero_Slider/images/01.jpg',
    link: '/new-arrivals',
    buttonText: 'Shop Now',
  },
  {
    id: 2,
    title: 'Summer Sale',
    subtitle: 'Up to 50% Off on Selected Items',
    image: '/img/Hero_Slider/images/02.jpg',
    link: '/sale',
    buttonText: 'Grab the Deal',
  },
  {
    id: 3,
    title: 'Comfort & Style',
    subtitle: 'Experience the Perfect Blend of Comfort and Elegance',
    image: '/img/Hero_Slider/images/03.jpg',
    link: '/comfort-style',
    buttonText: 'Explore Collection',
  },
  {
    id: 4,
    title: 'Outdoor Furniture',
    subtitle: 'Create Your Ideal Outdoor Space',
    image: '/img/Hero_Slider/images/04.jpg',
    link: '/outdoor',
    buttonText: 'Shop Outdoor',
  },
  {
    id: 5,
    title: 'Exclusive Offers',
    subtitle: 'Members-Only Deals and Discounts',
    image: '/img/Hero_Slider/images/05.jpg',
    link: '/exclusive-offers',
    buttonText: 'Become a Member',
  },
];

const getHome = async (req, res, next) => {
  try {
    const { products } = await productService.getProducts(); // Fetch products
    res.render('home/home', { products, categories, heroSlider }); // Render the 'home' EJS view
  } catch (error) {
    console.error('Error fetching home data:', error);
    next(error); // Pass the error to the next middleware
  }
};

module.exports = {
  getHome,
};
