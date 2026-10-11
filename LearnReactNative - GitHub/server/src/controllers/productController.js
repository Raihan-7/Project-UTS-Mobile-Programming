const prisma = require('../lib/prisma');

async function listProducts(req, res) {
  const { q, categoryId } = req.query;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId: String(categoryId) } : {}),
      ...(q ? { name: { contains: String(q) } } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: products });
}

async function listSellerProducts(req, res) {
  const products = await prisma.product.findMany({
    where: {
      sellerId: req.user.id,
      isActive: true,
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: products });
}

async function createProduct(req, res) {
  const { name, description, price, stock, categoryId, imageUrl } = req.body;

  if (
    !name ||
    !description ||
    !categoryId ||
    Number(price) <= 0 ||
    !Number.isInteger(Number(stock)) ||
    Number(stock) < 0
  ) {
    return res.status(400).json({ message: 'Data produk tidak valid' });
  }

  const product = await prisma.product.create({
    data: {
      sellerId: req.user.id,
      categoryId,
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      imageUrl: imageUrl || null,
    },
  });

  res.status(201).json({ data: product });
}

async function updateProduct(req, res) {
  const existing = await prisma.product.findFirst({
    where: {
      id: req.params.id,
      sellerId: req.user.id,
      isActive: true,
    },
  });

  if (!existing) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }

  const { name, description, price, stock, categoryId, imageUrl } = req.body;

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(categoryId !== undefined && { categoryId }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(price !== undefined && { price: Number(price) }),
      ...(stock !== undefined && { stock: Number(stock) }),
    },
  });

  res.json({ data: product });
}

async function deleteProduct(req, res) {
  const result = await prisma.product.updateMany({
    where: {
      id: req.params.id,
      sellerId: req.user.id,
      isActive: true,
    },
    data: { isActive: false },
  });

  if (!result.count) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }

  res.json({ message: 'Produk berhasil dihapus' });
}

module.exports = {
  listProducts,
  listSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};