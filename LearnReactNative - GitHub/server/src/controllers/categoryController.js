const prisma = require('../lib/prisma');

async function listCategories(_req, res) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  res.json({ data: categories });
}

async function createCategory(req, res) {
  const name = req.body?.name;

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Nama kategori wajib diisi' });
  }

  try {
    const category = await prisma.category.create({
      data: { name: name.trim() },
    });

    return res.status(201).json({ data: category });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({ message: 'Kategori sudah terdaftar' });
    }

    throw error;
  }
}

module.exports = { listCategories, createCategory };