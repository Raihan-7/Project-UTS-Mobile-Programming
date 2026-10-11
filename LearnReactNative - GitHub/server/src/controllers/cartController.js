const prisma = require('../lib/prisma');

async function getOrCreateCart(userId) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function getCart(req, res) {
  const cart = await prisma.cart.upsert({
    where: { userId: req.user.id },
    update: {},
    create: { userId: req.user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              imageUrl: true,
              isActive: true,
              sellerId: true,
            },
          },
        },
      },
    },
  });

  res.json({ data: cart });
}

async function addCartItem(req, res) {
  const { productId, quantity } = req.body ?? {};

  if (
    typeof productId !== 'string' ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return res.status(400).json({
      message: 'productId dan quantity positif wajib diisi',
    });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
  });

  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }

  const cart = await getOrCreateCart(req.user.id);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  const requestedQuantity = (existing?.quantity ?? 0) + quantity;

  if (requestedQuantity > product.stock) {
    return res.status(400).json({ message: 'Stok produk tidak mencukupi' });
  }

  const item = await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: requestedQuantity },
    create: { cartId: cart.id, productId, quantity },
    include: { product: true },
  });

  res.status(201).json({ data: item });
}

async function updateCartItem(req, res) {
  const { quantity } = req.body ?? {};

  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: 'quantity harus bilangan bulat positif' });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
  });

  if (!cart) {
    return res.status(404).json({ message: 'Item keranjang tidak ditemukan' });
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: req.params.id, cartId: cart.id },
    include: { product: true },
  });

  if (!item) {
    return res.status(404).json({ message: 'Item keranjang tidak ditemukan' });
  }

  if (!item.product.isActive || quantity > item.product.stock) {
    return res.status(400).json({ message: 'Stok produk tidak mencukupi' });
  }

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
    include: { product: true },
  });

  res.json({ data: updated });
}

async function deleteCartItem(req, res) {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
  });

  if (!cart) {
    return res.status(404).json({ message: 'Item keranjang tidak ditemukan' });
  }

  const result = await prisma.cartItem.deleteMany({
    where: { id: req.params.id, cartId: cart.id },
  });

  if (result.count === 0) {
    return res.status(404).json({ message: 'Item keranjang tidak ditemukan' });
  }

  res.json({ message: 'Item berhasil dihapus dari keranjang' });
}

module.exports = { getCart, addCartItem, updateCartItem, deleteCartItem };