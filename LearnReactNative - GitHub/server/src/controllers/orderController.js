const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

async function getOrders(req, res) {
  const where = req.user.role === 'SELLER'
    ? { sellerId: req.user.id }
    : { buyerId: req.user.id };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });

  res.json({ data: orders });
}

async function getOrderById(req, res) {
  const ownershipField = req.user.role === 'SELLER' ? 'sellerId' : 'buyerId';
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, [ownershipField]: req.user.id },
    include: {
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  }

  res.json({ data: order });
}

async function checkout(req, res) {
  const { cartItemIds } = req.body;

  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    return res.status(400).json({ message: 'Pilih item keranjang' });
  }

  try {
    const order = await prisma.$transaction(async tx => {
      const cart = await tx.cart.findUnique({
        where: { userId: req.user.id },
        include: {
          items: {
            where: { id: { in: cartItemIds } },
            include: { product: true },
          },
        },
      });

      if (!cart || cart.items.length !== cartItemIds.length) {
        throw new Error('CART_INVALID');
      }

      const sellerIds = new Set(cart.items.map(item => item.product.sellerId));
      if (sellerIds.size !== 1) throw new Error('ONE_SELLER');

      let total = new Prisma.Decimal(0);

      for (const item of cart.items) {
        const changed = await tx.product.updateMany({
          where: {
            id: item.productId,
            isActive: true,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (!changed.count) throw new Error('STOCK');

        total = total.plus(
          new Prisma.Decimal(item.product.price).mul(item.quantity),
        );
      }

      const created = await tx.order.create({
        data: {
          buyerId: req.user.id,
          sellerId: cart.items[0].product.sellerId,
          total: total.toFixed(2),
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              name: item.product.name,
              unitPrice: item.product.price,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({
        where: { id: { in: cartItemIds }, cartId: cart.id },
      });

      return created;
    });

    res.status(201).json({ data: order });
  } catch (error) {
    const messages = {
      CART_INVALID: 'Item keranjang tidak valid',
      ONE_SELLER: 'Dalam satu pesanan, pilih produk dari satu penjual',
      STOCK: 'Stok produk tidak mencukupi',
    };

    res.status(400).json({
      message: messages[error.message] || 'Checkout gagal',
    });
  }
}

async function updateOrderStatus(req, res) {
  const { status } = req.body;
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, sellerId: req.user.id },
  });

  if (!order) {
    return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  }

  const nextStatus = {
    PENDING_PAYMENT: 'PROCESSING',
    PROCESSING: 'COMPLETED',
  };

  if (nextStatus[order.status] !== status) {
    return res.status(400).json({ message: 'Perubahan status tidak valid' });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status },
  });

  res.json({ data: updated });
}

module.exports = { getOrders, getOrderById, checkout, updateOrderStatus };