const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = header.split(' ')[1];
    const decoded = verifyToken(token);

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
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    // ======================================================
    // PERMISSION RESOLUTION — STRICT MODE
    // ======================================================
    // Owner-type roles → use GLOBAL role permissions
    // Team members    → use ONLY brand team role permissions
    // ======================================================

    const ownerRoles = ['SUPER_ADMIN', 'BRAND_OWNER', 'AGENCY'];
    const isOwner = roles.some((r) => ownerRoles.includes(r));
    const isTeamMember = roles.includes('BRAND_TEAM_MEMBER') && !isOwner;

    let resolvedPermissions = [];

    if (isTeamMember) {
      //  STRICT: team member gets ONLY their brand team role's permissions.
      // Global role permissions are completely ignored.
      const brandTeamRole = user.brandTeamMemberships[0]?.teamRole;
      resolvedPermissions = brandTeamRole?.permissions ?? [];
    } else {
      // Owner / Admin / Influencer / Shopper → global role permissions
      const globalPermissions = new Set();
      for (const ur of user.userRoles) {
        for (const rp of ur.role.rolePermissions) {
          globalPermissions.add(rp.permission.name);
        }
      }
      resolvedPermissions = Array.from(globalPermissions);
    }

    // Brand team role context
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
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    next(err);
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const hasAll = requiredPermissions.every((p) =>
      req.user.permissions.includes(p)
    );
    if (!hasAll) {
      return res.status(403).json({
        message: 'Forbidden: missing permissions',
        required: requiredPermissions,
      });
    }
    next();
  };
}

function requireBrandContext(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!req.user.organizationId && !req.user.brandId) {
    return res.status(403).json({
      message: 'You must belong to a brand to do this',
    });
  }
  next();
}

function requireApproved(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.pendingApproval) {
    return res.status(403).json({
      message: 'Your account is pending approval.',
      code: 'PENDING_APPROVAL',
    });
  }
  next();
}

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  requireBrandContext,
  requireApproved,
};
