const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

router.get('/dashboard', authMiddleware, userController.dashboard);
router.post('/subscribe', authMiddleware, userController.subscribe);
router.post('/update-charity', authMiddleware, userController.updateCharity);
router.get('/subscribe', userController.showSubscribeForm);
router.post('/subscribe', userController.createSubscription);

module.exports = router;