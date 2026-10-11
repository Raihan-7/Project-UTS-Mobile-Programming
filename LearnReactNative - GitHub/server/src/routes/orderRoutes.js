const express = require('express');
const {
	getOrders,
	getOrderById,
	checkout,
	updateOrderStatus,
} = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('BUYER'), checkout);
router.get('/', requireAuth, getOrders);
router.get('/:id', requireAuth, getOrderById);
router.patch('/:id/status', requireAuth, requireRole('SELLER'), updateOrderStatus);

module.exports = router;