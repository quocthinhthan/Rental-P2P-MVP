const express = require('express');
const router = express.Router();
const { getPublicUserProfile } = require('../controllers/users.controller');

router.get('/:id/profile', getPublicUserProfile);

module.exports = router;
