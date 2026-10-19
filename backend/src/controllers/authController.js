// controllers/authController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');
const { sendToUser } = require('../services/email');

const PUBLIC_SIGNUP_ROLES = [
  'BRAND_OWNER',
  'BRAND_TEAM_MEMBER',
  'INFLUENCER',
  'AGENCY',
  'SHOPPER',
];

const ROLES_REQUIRING_ORG = ['BRAND_OWNER', 'AGENCY'];
const ROLES_PENDING_APPROVAL = ['BRAND_TEAM_MEMBER'];

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const CAPTCHA_AFTER_ATTEMPTS = 3;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between resend requests

// ======================================================
// Helpers
// ======================================================
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function frontendBase() {
  return (
    (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')[0]
      .trim() || 'http://localhost:3000'
  );
}

async function sendVerificationEmail(userId, email, name, token) {
  const verifyUrl = `${frontendBase()}/verify-email?token=${token}`;
  sendToUser(userId, 'verifyEmail', {
    verifyUrl,
    expiresInHours: VERIFY_TOKEN_TTL_MS / 3600000,
  }).catch((e) =>
    console.error('[auth.sendVerification email] failed:', e.message)
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[auth.verifyEmail] 📧 Dev verify link for ${email}: ${verifyUrl}`
    );
  }
}

// ======================================================
// POST /api/auth/register
// ======================================================
async function register(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      organizationName,
      role,
      phone,
      country,
      countryCode,
    } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: 'This email is already registered.' });
    }

    const roleName = role || 'BRAND_OWNER';

    if (!PUBLIC_SIGNUP_ROLES.includes(roleName)) {
      return res.status(403).json({
        message:
          'This role cannot be self-registered. Please contact an administrator.',
      });
    }

    const roleRecord = await prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!roleRecord) {
      return res.status(400).json({ message: 'Invalid role selected.' });
    }

    if (ROLES_REQUIRING_ORG.includes(roleName) && !organizationName) {
      return res
        .status(400)
        .json({ message: 'Organization name is required for this role.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Email verification token (hash stored, raw sent to user)
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = hashToken(rawVerifyToken);

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
          email: normalizedEmail,
          password: hashedPassword,
          organizationId,
          phone: phone ? String(phone).trim() : null,
          country: country ? String(country).trim() : null,
          countryCode: countryCode
            ? String(countryCode).trim().toUpperCase()
            : null,
          // NEW: require email verification for new signups
          emailVerified: false,
          emailVerifyToken: verifyTokenHash,
          emailVerifyExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
          emailVerifySentAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: roleRecord.id },
      });

      return user;
    });

    // Fire-and-forget — never blocks response
    sendToUser(result.id, 'welcome', { role: roleName }).catch((e) =>
      console.error('[auth.welcome email] failed:', e.message)
    );
    sendVerificationEmail(
      result.id,
      result.email,
      result.name,
      rawVerifyToken
    );

    // Team member — pending approval (no token; verification still required at login)
    if (ROLES_PENDING_APPROVAL.includes(roleName)) {
      return res.status(201).json({
        message:
          "Account created. Please verify your email, then wait for the brand owner's approval.",
        token: null,
        pendingApproval: true,
        emailVerified: false,
        user: {
          id: result.id,
          name: result.name,
          email: result.email,
          organizationId: null,
          roles: [roleName],
          permissions: [],
          pendingApproval: true,
          emailVerified: false,
        },
      });
    }

    // Normal flow — no token until email verified
    return res.status(201).json({
      message:
        'Account created. Please check your email to verify your account before signing in.',
      token: null,
      emailVerified: false,
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        organizationId: result.organizationId,
        roles: [roleName],
        pendingApproval: false,
        emailVerified: false,
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
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
      return res.status(401).json({
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfterSec = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000
      );
      res.set('Retry-After', String(retryAfterSec));
      return res.status(423).json({
        message: `Account temporarily locked due to multiple failed attempts. Try again in ${Math.ceil(
          retryAfterSec / 60
        )} minute(s).`,
        code: 'ACCOUNT_LOCKED',
        retryAfter: retryAfterSec,
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    // ---------- Wrong password ----------
    if (!valid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
      const lockUntil = shouldLock
        ? new Date(Date.now() + LOCK_DURATION_MS)
        : null;

      prisma.user
        .update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lastFailedLoginAt: new Date(),
            lockedUntil: lockUntil,
          },
        })
        .catch((e) =>
          console.error('[auth.login] failed-attempt update error:', e.message)
        );

      // D4: send lockout email (fire-and-forget, non-blocking)
      if (shouldLock) {
        sendToUser(user.id, 'accountLocked', {
          lockedUntilMinutes: LOCK_DURATION_MS / 60000,
          lastAttemptAt: new Date().toISOString(),
          ip: req.ip,
        }).catch((e) =>
          console.error('[auth.login lockout email] failed:', e.message)
        );
      }

      const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - attempts);

      return res.status(401).json({
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
        ...(shouldLock && { lockedFor: LOCK_DURATION_MS / 1000 }),
        ...(!shouldLock && remaining <= 2 && { attemptsRemaining: remaining }),
        ...(attempts >= CAPTCHA_AFTER_ATTEMPTS && { captchaRequired: true }),
      });
    }

    // ---------- Password OK — reset counters ----------
    prisma.user
      .update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: req.ip,
        },
      })
      .catch((e) =>
        console.error('[auth.login] metadata update error:', e.message)
      );

    // ---------- NEW: Require verified email ----------
    if (user.emailVerified === false) {
      // Mask email so we can display it (still proves ownership via password)
      const [local, domain] = user.email.split('@');
      const masked =
        local.length <= 2
          ? `${local[0]}*@${domain}`
          : `${local.slice(0, 2)}***@${domain}`;

      return res.status(403).json({
        message:
          'Please verify your email address before signing in. Check your inbox for the verification link.',
        code: 'EMAIL_NOT_VERIFIED',
        email: masked,
      });
    }

    // ---------- Pending team member ----------
    const roles = user.userRoles.map((ur) => ur.role.name);
    const isPendingTeamMember =
      roles.includes('BRAND_TEAM_MEMBER') && !user.organizationId;

    if (isPendingTeamMember) {
      return res.status(403).json({
        message:
          "Your account is still waiting for the brand owner's approval. You'll be able to sign in once it's approved.",
        code: 'PENDING_APPROVAL',
      });
    }

    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name)
        )
      )
    );

    const token = signToken({ userId: user.id });

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
        pendingApproval: false,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/auth/forgot-password
// ======================================================
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const GENERIC_OK = {
      message:
        'If an account exists for this email, we\u2019ve sent a password reset link.',
    };

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.json(GENERIC_OK);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expires,
      },
    });

    const resetUrl = `${frontendBase()}/reset-password?token=${rawToken}`;

    sendToUser(user.id, 'passwordReset', {
      resetUrl,
      expiresInMinutes: RESET_TOKEN_TTL_MS / 60000,
    }).catch((e) =>
      console.error('[auth.forgotPassword email] failed:', e.message)
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[auth.forgotPassword] 🔑 Dev reset link for ${user.email}: ${resetUrl}`
      );
    }

    return res.json(GENERIC_OK);
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/auth/reset-password
// ======================================================
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        message: 'Reset token is required.',
        code: 'MISSING_TOKEN',
      });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        message: 'New password is required.',
        code: 'MISSING_PASSWORD',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters.',
        code: 'WEAK_PASSWORD',
      });
    }

    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(400).json({
        message:
          'This reset link is invalid or has expired. Please request a new one.',
        code: 'INVALID_RESET_TOKEN',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    sendToUser(user.id, 'passwordChanged', {}).catch((e) =>
      console.error('[auth.resetPassword email] failed:', e.message)
    );

    return res.json({
      message:
        'Your password has been reset. You can now sign in with your new password.',
      code: 'PASSWORD_RESET_SUCCESS',
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/auth/change-password (authenticated)
// ======================================================
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: 'Please sign in to continue.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (
      !currentPassword ||
      typeof currentPassword !== 'string' ||
      !newPassword ||
      typeof newPassword !== 'string'
    ) {
      return res.status(400).json({
        message: 'Current and new password are required.',
        code: 'MISSING_FIELDS',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters.',
        code: 'WEAK_PASSWORD',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: 'New password must be different from your current password.',
        code: 'SAME_PASSWORD',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Please sign in again.',
        code: 'INVALID_USER',
      });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({
        message: 'Current password is incorrect.',
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    sendToUser(userId, 'passwordChanged', {}).catch((e) =>
      console.error('[auth.changePassword email] failed:', e.message)
    );

    return res.json({
      message: 'Your password has been updated.',
      code: 'PASSWORD_CHANGED',
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/auth/verify-email
// ======================================================
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        message: 'Verification token is required.',
        code: 'MISSING_TOKEN',
      });
    }

    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: tokenHash,
        emailVerifyExpires: { gt: new Date() },
      },
      select: { id: true, email: true, isActive: true, emailVerified: true },
    });

    if (!user) {
      return res.status(400).json({
        message:
          'This verification link is invalid or has expired. Please request a new one.',
        code: 'INVALID_VERIFY_TOKEN',
      });
    }

    if (user.emailVerified === true) {
      // Idempotent — already verified
      return res.json({
        message: 'Your email is already verified. You can sign in now.',
        code: 'ALREADY_VERIFIED',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    return res.json({
      message: 'Email verified. You can now sign in.',
      code: 'EMAIL_VERIFIED',
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/auth/verify-email/resend
// ======================================================
async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const GENERIC_OK = {
      message:
        'If this email is registered and unverified, we\u2019ve sent a new verification link.',
    };

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        emailVerified: true,
        emailVerifySentAt: true,
      },
    });

    // Non-existent / already verified / inactive → silent 200
    if (!user || !user.isActive || user.emailVerified === true) {
      return res.json(GENERIC_OK);
    }

    // Cooldown — prevent email spam
    if (
      user.emailVerifySentAt &&
      Date.now() - new Date(user.emailVerifySentAt).getTime() < RESEND_COOLDOWN_MS
    ) {
      return res.json(GENERIC_OK);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: tokenHash,
        emailVerifyExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
        emailVerifySentAt: new Date(),
      },
    });

    sendVerificationEmail(user.id, user.email, user.name, rawToken);

    return res.json(GENERIC_OK);
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
      phone: req.user.phone ?? null,
      country: req.user.country ?? null,
      countryCode: req.user.countryCode ?? null,
      roles: req.user.roles,
      permissions: req.user.permissions,
    },
  });
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerification,
  me,
};