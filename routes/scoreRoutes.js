const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const scoreController = require('../controllers/scoreController');

router.post('/add', authMiddleware, scoreController.addScore);
router.get('/delete/:id', authMiddleware, scoreController.deleteScore);

module.exports = router;