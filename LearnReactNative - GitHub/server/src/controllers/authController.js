const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function register(req, res) {
  const { name, email, password, role } = req.body ?? {};

  const missingFields = ['name', 'email', 'password'].filter(
    field => typeof req.body?.[field] !== 'string' || !req.body[field].trim(),
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Field wajib diisi: ${missingFields.join(', ')}`,
    });
  }

  const normalizedRole = typeof role === 'string' ? role.trim().toUpperCase() : '';
  if (!['BUYER', 'SELLER'].includes(normalizedRole)) {
    return res.status(400).json({
      message: 'role harus bernilai BUYER atau SELLER',
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Email sudah terdaftar' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash, role: normalizedRole },
    select: { id: true, name: true, email: true, role: true },
  });

  res.status(201).json({ data: user });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' },
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

module.exports = { register, login };