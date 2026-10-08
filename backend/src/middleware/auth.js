// middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');


const PENDING_SAFE_PATHS = [
  '/api/auth/me',
  '/api/auth/logout',
];

function isPendingSafePath(req) {
  const url = req.originalUrl || req.url || '';
  return PENDING_SAFE_PATHS.some((p) => url.startsWith(p));
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    const token = header.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Your session has expired. Please sign in again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        message: 'Your session is invalid. Please sign in again.',
        code: 'INVALID_TOKEN',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        brandTeamMemberships: {
          where: { status: 'ACTIVE' },
          include: {
            teamRole: true,
            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Your session is invalid. Please sign in again.',
        code: 'INVALID_USER',
      });
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    // ======================================================
    // PERMISSION RESOLUTION
    // ======================================================
    const ownerRoles = ['SUPER_ADMIN', 'BRAND_OWNER', 'AGENCY'];
    const isOwner = roles.some((r) => ownerRoles.includes(r));
    const isTeamMember = roles.includes('BRAND_TEAM_MEMBER') && !isOwner;

    let resolvedPermissions = [];

    if (isTeamMember) {
      const brandTeamRole = user.brandTeamMemberships[0]?.teamRole;
      resolvedPermissions = brandTeamRole?.permissions ?? [];
    } else {
      const globalPermissions = new Set();
      for (const ur of user.userRoles) {
        for (const rp of ur.role.rolePermissions) {
          globalPermissions.add(rp.permission.name);
        }
      }
      resolvedPermissions = Array.from(globalPermissions);
    }

    const brandTeamRole = user.brandTeamMemberships[0]?.teamRole;
    const primaryBrand = user.brandTeamMemberships[0]?.brand ?? null;

    // ======================================================
    // PENDING APPROVAL DETECTION
    // ======================================================
    const pendingRequest = await prisma.brandJoinRequest.findFirst({
      where: { userId: user.id, status: 'PENDING' },
      include: { brand: { select: { id: true, name: true } } },
    });

    const hasActiveBrandRole = user.brandTeamMemberships.length > 0;
    const pendingApproval =
      !!pendingRequest ||
      (roles.includes('BRAND_TEAM_MEMBER') && !isOwner && !hasActiveBrandRole);

    // ======================================================
    // ✅ BLOCK PENDING USERS — every request, every route
    // ======================================================
    if (pendingApproval && !isPendingSafePath(req)) {
      return res.status(403).json({
        message:
          "Your account is still waiting for the brand owner's approval. You'll be able to sign in once it's approved.",
        code: 'PENDING_APPROVAL',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      roles,
      permissions: resolvedPermissions,

      brandTeamRole: brandTeamRole
        ? {
            id: brandTeamRole.id,
            name: brandTeamRole.name,
            permissions: brandTeamRole.permissions,
            isOwnerRole: brandTeamRole.isOwnerRole,
          }
        : null,
      brandId: primaryBrand?.id ?? null,
      brandName: primaryBrand?.name ?? null,

      pendingApproval,
      pendingRequest: pendingRequest
        ? {
            id: pendingRequest.id,
            brandId: pendingRequest.brandId,
            brandName: pendingRequest.brand?.name ?? null,
            requestedRoleId: pendingRequest.requestedRoleId,
          }
        : null,
    };

    next();
  } catch (err) {
    next(err);
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res
        .status(403)
        .json({ message: "You don't have permission to do that." });
    }
    next();
  };
}

function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    const hasAll = requiredPermissions.every((p) =>
      req.user.permissions.includes(p)
    );
    if (!hasAll) {
      return res
        .status(403)
        .json({ message: "You don't have permission to do that." });
    }
    next();
  };
}

function requireBrandContext(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }
  if (!req.user.organizationId && !req.user.brandId) {
    return res.status(403).json({
      message: 'You must belong to a brand to do this.',
    });
  }
  next();
}

function requireApproved(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }
  if (req.user.pendingApproval) {
    return res.status(403).json({
      message:
        "Your account is still waiting for the brand owner's approval. You'll be able to sign in once it's approved.",
      code: 'PENDING_APPROVAL',
    });
  }
  next();
}

function requirePermissionOrRole({ permissions = [], roles: allowedRoles = [] } = {}) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    const hasPerm =
      permissions.length > 0 &&
      permissions.every((p) => req.user.permissions.includes(p));
    const hasRole =
      allowedRoles.length > 0 &&
      req.user.roles.some((r) => allowedRoles.includes(r));

    if (hasPerm || hasRole) return next();

    return res
      .status(403)
      .json({ message: "You don't have permission to do that." });
  };
}

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  requirePermissionOrRole,
  requireBrandContext,
  requireApproved,
};