const multer = require('multer');

// Configure multer to store files in memory
const storage = multer.memoryStorage(); // Use memory storage
const upload = multer({ storage: storage });

module.exports = upload;
