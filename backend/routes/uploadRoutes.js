// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processCsvUpload } = require('../controllers/uploadController');

// Configure multer to hold the file in memory
const upload = multer({ storage: multer.memoryStorage() });

// Define the route, intercept the file with multer, then call the controller
router.post('/upload-csv', upload.single('file'), processCsvUpload);

module.exports = router;