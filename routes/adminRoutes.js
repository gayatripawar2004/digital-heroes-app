const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.get('/dashboard', authMiddleware, adminMiddleware, adminController.dashboard);
router.post('/run-draw', authMiddleware, adminMiddleware, adminController.runDraw);
router.post('/verify-payout', authMiddleware, adminMiddleware, adminController.verifyPayout);

module.exports = router;