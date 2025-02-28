const express = require('express');
const router = express.Router();

const apiProductControllers = require('./apiProductControllers');

router.get('/', apiProductControllers.getProductsAPI);

module.exports = router;
