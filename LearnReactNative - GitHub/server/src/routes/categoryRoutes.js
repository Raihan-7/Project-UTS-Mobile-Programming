const express = require('express');
const {
  listCategories,
  createCategory,
} = require('../controllers/categoryController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listCategories);
router.post('/', requireAuth, requireRole('SELLER'), createCategory);

module.exports = router;