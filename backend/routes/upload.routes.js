// backend/routes/upload.routes.js
const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth.middleware');

// Hàm helper để upload từ buffer lên Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// POST /api/upload (yêu cầu đăng nhập)
router.post('/', protect, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer);
    // Trả về URL an toàn của ảnh đã upload
    res.status(201).json({ imageUrl: result.secure_url, publicId: result.public_id });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Error uploading image.', error: error.message });
  }
});

// POST /api/upload/delete (yêu cầu đăng nhập)
router.post('/delete', protect, async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) {
    return res.status(400).json({ message: 'Missing publicId.' });
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    res.status(200).json({ result });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({ message: 'Error deleting image.', error: error.message });
  }
});

module.exports = router;