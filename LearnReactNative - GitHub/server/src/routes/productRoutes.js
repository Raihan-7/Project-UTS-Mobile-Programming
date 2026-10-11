const express = require('express');
const {
  listProducts,
  listSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listProducts);
router.get('/mine', requireAuth, requireRole('SELLER'), listSellerProducts);
router.post('/', requireAuth, requireRole('SELLER'), createProduct);
router.patch('/:id', requireAuth, requireRole('SELLER'), updateProduct);
router.delete('/:id', requireAuth, requireRole('SELLER'), deleteProduct);

module.exports = router;