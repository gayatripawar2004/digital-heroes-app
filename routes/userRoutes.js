const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// Dashboard
router.get('/dashboard', authMiddleware, userController.dashboard);

// Subscription forms and actions
router.get('/subscribe', authMiddleware, userController.showSubscribeForm);
router.post('/subscribe', authMiddleware, userController.createSubscription);

// Update charity percentage
router.post('/update-charity', authMiddleware, userController.updateCharityPercentage);

// Edit score
router.post('/score/edit/:id', authMiddleware, userController.editScore);

module.exports = router;