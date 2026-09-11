const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password, organizationName, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const roleName = role || 'BRAND_OWNER';
    const roleRecord = await prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!roleRecord) {
      return res.status(400).json({ message: `Role ${roleName} not found` });
    }

    const result = await prisma.$transaction(async (tx) => {
      let organizationId = null;

      if (roleName === 'BRAND_OWNER' || roleName === 'AGENCY') {
        if (!organizationName) {
          throw Object.assign(
            new Error('organizationName required for this role'),
            { status: 400 }
          );
        }
        const slug = organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: `${slug}-${Date.now().toString(36)}`,
          },
        });
        organizationId = org.id;
      }

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          organizationId,
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: roleRecord.id },
      });

      return user;
    });

    const token = signToken({ userId: result.id });

    res.status(201).json({
      message: 'Registered successfully',
      token,
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        organizationId: result.organizationId,
        role: roleName,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.id });

    res.json({
      message: 'Logged in',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        roles: user.userRoles.map((ur) => ur.role.name),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      organizationId: req.user.organizationId,
      roles: req.user.roles,
      permissions: req.user.permissions,
    },
  });
}

module.exports = { register, login, me };