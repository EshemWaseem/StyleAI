// controllers/authController.js
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');
const { sendToUser } = require('../services/email');

// ======================================================
// Roles allowed for PUBLIC self-registration.
// ======================================================
const PUBLIC_SIGNUP_ROLES = [
  'BRAND_OWNER',
  'BRAND_TEAM_MEMBER',
  'INFLUENCER',
  'AGENCY',
  'SHOPPER',
];

// Roles that require an organization name at signup
const ROLES_REQUIRING_ORG = ['BRAND_OWNER', 'AGENCY'];

// ======================================================
// POST /api/auth/register
// ======================================================
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

    const roleName = role || 'BRAND_OWNER';

    if (!PUBLIC_SIGNUP_ROLES.includes(roleName)) {
      return res.status(403).json({
        message: 'This role cannot be self-registered. Contact an administrator.',
      });
    }

    const roleRecord = await prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!roleRecord) {
      return res.status(400).json({ message: `Role ${roleName} not found` });
    }

    if (ROLES_REQUIRING_ORG.includes(roleName) && !organizationName) {
      return res
        .status(400)
        .json({ message: 'organizationName required for this role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      let organizationId = null;

      if (ROLES_REQUIRING_ORG.includes(roleName)) {
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
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          organizationId,
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: roleRecord.id },
      });

      return user;
    });

    // ---- Issue JWT ----
    const token = signToken({ userId: result.id });

    // ✅ Welcome email — non-blocking, silent-fail
    sendToUser(result.id, 'welcome', { role: roleName })
      .catch((e) => console.error('[auth.welcome email] failed:', e.message));

    res.status(201).json({
      message: 'Registered successfully',
      token,
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        organizationId: result.organizationId,
        roles: [roleName],
      },
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/auth/login
// ======================================================
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.id });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name)
        )
      )
    );

    res.json({
      message: 'Logged in',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        roles,
        permissions,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// GET /api/auth/me
// ======================================================
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





// 02-10-2026  --------------------5:02
// // controllers/authController.js
// const bcrypt = require('bcryptjs');
// const prisma = require('../config/prisma');
// const { signToken } = require('../utils/jwt');

// // ======================================================
// // Roles allowed for PUBLIC self-registration.
// // SUPER_ADMIN must be assigned manually (via seed or by another admin).
// // ======================================================
// const PUBLIC_SIGNUP_ROLES = [
//   'BRAND_OWNER',
//   'BRAND_TEAM_MEMBER',
//   'INFLUENCER',
//   'AGENCY',
//   'SHOPPER'
// ];

// // Roles that require an organization name at signup
// const ROLES_REQUIRING_ORG = ['BRAND_OWNER', 'AGENCY'];

// // ======================================================
// // POST /api/auth/register
// // ======================================================
// async function register(req, res, next) {
//   try {
//     const { name, email, password, organizationName, role } = req.body;

//     // ---- Validate required fields ----
//     if (!name || !email || !password) {
//       return res.status(400).json({ message: 'name, email, password required' });
//     }

//     if (password.length < 6) {
//       return res
//         .status(400)
//         .json({ message: 'Password must be at least 6 characters' });
//     }

//     // ---- Check duplicate email ----
//     const existing = await prisma.user.findUnique({ where: { email } });
//     if (existing) {
//       return res.status(409).json({ message: 'Email already registered' });
//     }

//     // ---- Validate role ----
//     const roleName = role || 'BRAND_OWNER';

//     if (!PUBLIC_SIGNUP_ROLES.includes(roleName)) {
//       return res.status(403).json({
//         message:
//           'This role cannot be self-registered. Contact an administrator.',
//       });
//     }

//     const roleRecord = await prisma.role.findUnique({
//       where: { name: roleName },
//     });
//     if (!roleRecord) {
//       return res.status(400).json({ message: `Role ${roleName} not found` });
//     }

//     // ---- Require organization name for certain roles ----
//     if (ROLES_REQUIRING_ORG.includes(roleName) && !organizationName) {
//       return res
//         .status(400)
//         .json({ message: 'organizationName required for this role' });
//     }

//     // ---- Hash password ----
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // ---- Create user (+ organization if needed) in a transaction ----
//     const result = await prisma.$transaction(async (tx) => {
//       let organizationId = null;

//       if (ROLES_REQUIRING_ORG.includes(roleName)) {
//         const slug = organizationName
//           .toLowerCase()
//           .replace(/[^a-z0-9]+/g, '-')
//           .replace(/(^-|-$)/g, '');

//         const org = await tx.organization.create({
//           data: {
//             name: organizationName,
//             slug: `${slug}-${Date.now().toString(36)}`,
//           },
//         });
//         organizationId = org.id;
//       }

//       const user = await tx.user.create({
//         data: {
//           name: name.trim(),
//           email: email.trim().toLowerCase(),
//           password: hashedPassword,
//           organizationId,
//         },
//       });

//       await tx.userRole.create({
//         data: { userId: user.id, roleId: roleRecord.id },
//       });

//       return user;
//     });

//     // ---- Issue JWT ----
//     const token = signToken({ userId: result.id });

//     res.status(201).json({
//       message: 'Registered successfully',
//       token,
//       user: {
//         id: result.id,
//         name: result.name,
//         email: result.email,
//         organizationId: result.organizationId,
//         roles: [roleName],
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// }

// // ======================================================
// // POST /api/auth/login
// // ======================================================
// async function login(req, res, next) {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: 'email and password required' });
//     }

//     const user = await prisma.user.findUnique({
//       where: { email: email.trim().toLowerCase() },
//       include: {
//         userRoles: {
//           include: {
//             role: {
//               include: {
//                 rolePermissions: { include: { permission: true } },
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!user || !user.isActive) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const valid = await bcrypt.compare(password, user.password);
//     if (!valid) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const token = signToken({ userId: user.id });

//     const roles = user.userRoles.map((ur) => ur.role.name);
//     const permissions = Array.from(
//       new Set(
//         user.userRoles.flatMap((ur) =>
//           ur.role.rolePermissions.map((rp) => rp.permission.name)
//         )
//       )
//     );

//     res.json({
//       message: 'Logged in',
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         organizationId: user.organizationId,
//         roles,
//         permissions,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// }

// // ======================================================
// // GET /api/auth/me
// // ======================================================
// async function me(req, res) {
//   res.json({
//     user: {
//       id: req.user.id,
//       name: req.user.name,
//       email: req.user.email,
//       organizationId: req.user.organizationId,
//       roles: req.user.roles,
//       permissions: req.user.permissions,
//     },
//   });
// }

// module.exports = { register, login, me };