const express = require('express');
const {
  getCart,
  addCartItem,
  updateCartItem,
  deleteCartItem,
} = require('../controllers/cartController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('BUYER'));
router.get('/', getCart);
router.post('/items', addCartItem);
router.patch('/items/:id', updateCartItem);
router.delete('/items/:id', deleteCartItem);

module.exports = router;