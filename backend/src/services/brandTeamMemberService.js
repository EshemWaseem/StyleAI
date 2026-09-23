const prisma = require('../config/prisma');
const { ensureDefaultRoles } = require('./brandTeamRoleService');

// ======================================================
// HELPERS
// ======================================================

async function resolveBrand(user, brandId = null) {
  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      const err = new Error('Brand not found');
      err.status = 404;
      throw err;
    }
    if (
      !user.roles.includes('SUPER_ADMIN') &&
      brand.organizationId !== user.organizationId
    ) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    return brand;
  }

  if (!user.organizationId) {
    const err = new Error('You must belong to an organization');
    err.status = 403;
    throw err;
  }

  const brand = await prisma.brand.findFirst({
    where: { organizationId: user.organizationId },
  });
  if (!brand) {
    const err = new Error('Create your brand first');
    err.status = 400;
    err.code = 'NO_BRAND';
    throw err;
  }
  return brand;
}

function shape(member) {
  return {
    id: member.id,
    status: member.status,
    joinedAt: member.joinedAt,
    user: member.user
      ? {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
        }
      : undefined,
    role: member.teamRole
      ? {
          id: member.teamRole.id,
          name: member.teamRole.name,
          color: member.teamRole.color,
          permissions: member.teamRole.permissions,
          isOwnerRole: member.teamRole.isOwnerRole,
        }
      : undefined,
    invitedBy: member.inviter
      ? { id: member.inviter.id, name: member.inviter.name }
      : undefined,
  };
}

// ======================================================
// LIST MEMBERS
// ======================================================

async function listMembers(user, brandId = null) {
  const brand = await resolveBrand(user, brandId);
  await ensureDefaultRoles(brand.id);

  const members = await prisma.brandTeamMember.findMany({
    where: { brandId: brand.id, status: { not: 'REMOVED' } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      teamRole: true,
      inviter: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return members.map(shape);
}

// ======================================================
// GET ONE
// ======================================================

async function getMember(user, memberId) {
  const member = await prisma.brandTeamMember.findUnique({
    where: { id: memberId },
    include: {
      brand: true,
      user: { select: { id: true, name: true, email: true } },
      teamRole: true,
      inviter: { select: { id: true, name: true } },
    },
  });
  if (!member) {
    const err = new Error('Member not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    member.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return shape(member);
}

// ======================================================
// CHANGE MEMBER'S ROLE
// ======================================================

async function changeMemberRole(user, memberId, newRoleId) {
  const member = await prisma.brandTeamMember.findUnique({
    where: { id: memberId },
    include: { brand: true },
  });
  if (!member) {
    const err = new Error('Member not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    member.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const newRole = await prisma.brandTeamRole.findUnique({
    where: { id: newRoleId },
  });
  if (!newRole || newRole.brandId !== member.brandId) {
    const err = new Error('Role not found for this brand');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.brandTeamMember.update({
    where: { id: memberId },
    data: { teamRoleId: newRoleId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      teamRole: true,
      inviter: { select: { id: true, name: true } },
    },
  });

  return shape(updated);
}

// ======================================================
// SET MEMBER STATUS
// ======================================================

async function setMemberStatus(user, memberId, status) {
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    const err = new Error('Invalid status');
    err.status = 400;
    throw err;
  }

  const member = await prisma.brandTeamMember.findUnique({
    where: { id: memberId },
    include: { brand: true },
  });
  if (!member) {
    const err = new Error('Member not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    member.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const updated = await prisma.brandTeamMember.update({
    where: { id: memberId },
    data: { status },
    include: {
      user: { select: { id: true, name: true, email: true } },
      teamRole: true,
    },
  });

  return shape(updated);
}

// ======================================================
// REMOVE MEMBER
// ======================================================

async function removeMember(user, memberId) {
  const member = await prisma.brandTeamMember.findUnique({
    where: { id: memberId },
    include: { brand: true },
  });
  if (!member) {
    const err = new Error('Member not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    member.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  if (member.userId === user.id) {
    const err = new Error('Cannot remove yourself from the team');
    err.status = 400;
    throw err;
  }

  await prisma.brandTeamMember.update({
    where: { id: memberId },
    data: { status: 'REMOVED' },
  });

  const stillHasOtherMemberships = await prisma.brandTeamMember.count({
    where: { userId: member.userId, status: { not: 'REMOVED' } },
  });

  if (stillHasOtherMemberships === 0) {
    await prisma.user.update({
      where: { id: member.userId },
      data: { organizationId: null },
    });

    const teamRole = await prisma.role.findUnique({
      where: { name: 'BRAND_TEAM_MEMBER' },
    });
    if (teamRole) {
      await prisma.userRole.deleteMany({
        where: { userId: member.userId, roleId: teamRole.id },
      });
    }
  }

  return { id: memberId };
}

// ======================================================
// MY MEMBERSHIP
// ======================================================

async function getMyMembership(user) {
  if (!user.organizationId) return null;

  const membership = await prisma.brandTeamMember.findFirst({
    where: {
      userId: user.id,
      status: 'ACTIVE',
      brand: { organizationId: user.organizationId },
    },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      teamRole: true,
    },
  });

  if (!membership) return null;

  return {
    id: membership.id,
    brand: {
      id: membership.brand.id,
      name: membership.brand.name,
      slug: membership.brand.slug,
    },
    role: {
      id: membership.teamRole.id,
      name: membership.teamRole.name,
      color: membership.teamRole.color,
      permissions: membership.teamRole.permissions,
      isOwnerRole: membership.teamRole.isOwnerRole,
    },
    joinedAt: membership.joinedAt,
  };
}

// ======================================================
// DIRECT ADD MEMBER — smart (add or signal invite)
// ======================================================

async function directAddMember(user, { brandId = null, email, teamRoleId }) {
  if (!email || !email.trim()) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }
  if (!teamRoleId) {
    const err = new Error('Role is required');
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const brand = await resolveBrand(user, brandId);

  // Validate role belongs to brand
  const role = await prisma.brandTeamRole.findUnique({
    where: { id: teamRoleId },
  });
  if (!role || role.brandId !== brand.id) {
    const err = new Error('Role not found for this brand');
    err.status = 400;
    throw err;
  }

  // Prevent adding self
  if (user.email.toLowerCase() === normalizedEmail) {
    const err = new Error('Cannot add yourself');
    err.status = 400;
    throw err;
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // ======================================================
  // CASE 1: USER DOESN'T EXIST → signal invitation flow
  // ======================================================
  if (!targetUser) {
    return {
      type: 'USER_NOT_FOUND',
      email: normalizedEmail,
      roleId: role.id,
      brandId: brand.id,
    };
  }

  // ======================================================
  // CASE 2: USER EXISTS → check eligibility
  // ======================================================

  const existingMembership = await prisma.brandTeamMember.findUnique({
    where: { brandId_userId: { brandId: brand.id, userId: targetUser.id } },
  });

  if (existingMembership && existingMembership.status === 'ACTIVE') {
    const err = new Error('This user is already a member of your brand');
    err.status = 409;
    err.code = 'ALREADY_MEMBER';
    throw err;
  }

  if (
    targetUser.organizationId &&
    targetUser.organizationId !== brand.organizationId
  ) {
    const err = new Error(
      'This user already belongs to another organization and cannot be added'
    );
    err.status = 400;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Attach user to organization
    await tx.user.update({
      where: { id: targetUser.id },
      data: { organizationId: brand.organizationId },
    });

    // 2. Add global BRAND_TEAM_MEMBER role
    const globalTeamRole = await tx.role.findUnique({
      where: { name: 'BRAND_TEAM_MEMBER' },
    });
    const hasGlobalRole = await tx.userRole.findUnique({
      where: {
        userId_roleId: { userId: targetUser.id, roleId: globalTeamRole.id },
      },
    });
    if (!hasGlobalRole) {
      await tx.userRole.create({
        data: { userId: targetUser.id, roleId: globalTeamRole.id },
      });
    }

    // 3. Create/reactivate membership
    let membership;
    if (existingMembership) {
      membership = await tx.brandTeamMember.update({
        where: { id: existingMembership.id },
        data: {
          teamRoleId: role.id,
          status: 'ACTIVE',
          invitedBy: user.id,
        },
      });
    } else {
      membership = await tx.brandTeamMember.create({
        data: {
          brandId: brand.id,
          userId: targetUser.id,
          teamRoleId: role.id,
          status: 'ACTIVE',
          invitedBy: user.id,
        },
      });
    }

    // 4. Cancel any pending join request from this user
    await tx.brandJoinRequest.updateMany({
      where: {
        userId: targetUser.id,
        brandId: brand.id,
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        approvedRoleId: role.id,
      },
    });

    // 5. Cancel any pending invitations for this email
    await tx.brandInvitation.updateMany({
      where: {
        email: normalizedEmail,
        brandId: brand.id,
        status: 'PENDING',
      },
      data: { status: 'CANCELLED' },
    });

    return membership;
  });

  const full = await prisma.brandTeamMember.findUnique({
    where: { id: result.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      teamRole: true,
      inviter: { select: { id: true, name: true } },
    },
  });

  return {
    type: 'ADDED',
    member: shape(full),
  };
}

module.exports = {
  listMembers,
  getMember,
  changeMemberRole,
  setMemberStatus,
  removeMember,
  getMyMembership,
  directAddMember,
};















// const prisma = require('../config/prisma');
// const { ensureDefaultRoles } = require('./brandTeamRoleService');

// // ======================================================
// // HELPERS
// // ======================================================

// async function resolveBrand(user, brandId = null) {
//   if (brandId) {
//     const brand = await prisma.brand.findUnique({ where: { id: brandId } });
//     if (!brand) {
//       const err = new Error('Brand not found');
//       err.status = 404;
//       throw err;
//     }
//     if (
//       !user.roles.includes('SUPER_ADMIN') &&
//       brand.organizationId !== user.organizationId
//     ) {
//       const err = new Error('Forbidden');
//       err.status = 403;
//       throw err;
//     }
//     return brand;
//   }

//   if (!user.organizationId) {
//     const err = new Error('You must belong to an organization');
//     err.status = 403;
//     throw err;
//   }

//   const brand = await prisma.brand.findFirst({
//     where: { organizationId: user.organizationId },
//   });
//   if (!brand) {
//     const err = new Error('Create your brand first');
//     err.status = 400;
//     err.code = 'NO_BRAND';
//     throw err;
//   }
//   return brand;
// }

// function shape(member) {
//   return {
//     id: member.id,
//     status: member.status,
//     joinedAt: member.joinedAt,
//     user: member.user
//       ? {
//           id: member.user.id,
//           name: member.user.name,
//           email: member.user.email,
//         }
//       : undefined,
//     role: member.teamRole
//       ? {
//           id: member.teamRole.id,
//           name: member.teamRole.name,
//           color: member.teamRole.color,
//           permissions: member.teamRole.permissions,
//           isOwnerRole: member.teamRole.isOwnerRole,
//         }
//       : undefined,
//     invitedBy: member.inviter
//       ? { id: member.inviter.id, name: member.inviter.name }
//       : undefined,
//   };
// }

// // ======================================================
// // LIST MEMBERS
// // ======================================================

// async function listMembers(user, brandId = null) {
//   const brand = await resolveBrand(user, brandId);
//   await ensureDefaultRoles(brand.id);

//   const members = await prisma.brandTeamMember.findMany({
//     where: { brandId: brand.id, status: { not: 'REMOVED' } },
//     include: {
//       user: { select: { id: true, name: true, email: true } },
//       teamRole: true,
//       inviter: { select: { id: true, name: true } },
//     },
//     orderBy: { joinedAt: 'desc' },
//   });

//   return members.map(shape);
// }

// // ======================================================
// // GET ONE
// // ======================================================

// async function getMember(user, memberId) {
//   const member = await prisma.brandTeamMember.findUnique({
//     where: { id: memberId },
//     include: {
//       brand: true,
//       user: { select: { id: true, name: true, email: true } },
//       teamRole: true,
//       inviter: { select: { id: true, name: true } },
//     },
//   });
//   if (!member) {
//     const err = new Error('Member not found');
//     err.status = 404;
//     throw err;
//   }
//   if (
//     !user.roles.includes('SUPER_ADMIN') &&
//     member.brand.organizationId !== user.organizationId
//   ) {
//     const err = new Error('Forbidden');
//     err.status = 403;
//     throw err;
//   }
//   return shape(member);
// }

// // ======================================================
// // CHANGE MEMBER'S ROLE
// // ======================================================

// async function changeMemberRole(user, memberId, newRoleId) {
//   const member = await prisma.brandTeamMember.findUnique({
//     where: { id: memberId },
//     include: { brand: true },
//   });
//   if (!member) {
//     const err = new Error('Member not found');
//     err.status = 404;
//     throw err;
//   }
//   if (
//     !user.roles.includes('SUPER_ADMIN') &&
//     member.brand.organizationId !== user.organizationId
//   ) {
//     const err = new Error('Forbidden');
//     err.status = 403;
//     throw err;
//   }

//   const newRole = await prisma.brandTeamRole.findUnique({
//     where: { id: newRoleId },
//   });
//   if (!newRole || newRole.brandId !== member.brandId) {
//     const err = new Error('Role not found for this brand');
//     err.status = 404;
//     throw err;
//   }

//   const updated = await prisma.brandTeamMember.update({
//     where: { id: memberId },
//     data: { teamRoleId: newRoleId },
//     include: {
//       user: { select: { id: true, name: true, email: true } },
//       teamRole: true,
//       inviter: { select: { id: true, name: true } },
//     },
//   });

//   return shape(updated);
// }

// // ======================================================
// // SUSPEND / REACTIVATE
// // ======================================================

// async function setMemberStatus(user, memberId, status) {
//   if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
//     const err = new Error('Invalid status');
//     err.status = 400;
//     throw err;
//   }

//   const member = await prisma.brandTeamMember.findUnique({
//     where: { id: memberId },
//     include: { brand: true },
//   });
//   if (!member) {
//     const err = new Error('Member not found');
//     err.status = 404;
//     throw err;
//   }
//   if (
//     !user.roles.includes('SUPER_ADMIN') &&
//     member.brand.organizationId !== user.organizationId
//   ) {
//     const err = new Error('Forbidden');
//     err.status = 403;
//     throw err;
//   }

//   const updated = await prisma.brandTeamMember.update({
//     where: { id: memberId },
//     data: { status },
//     include: {
//       user: { select: { id: true, name: true, email: true } },
//       teamRole: true,
//     },
//   });

//   return shape(updated);
// }

// // ======================================================
// // REMOVE MEMBER
// // ======================================================

// async function removeMember(user, memberId) {
//   const member = await prisma.brandTeamMember.findUnique({
//     where: { id: memberId },
//     include: { brand: true },
//   });
//   if (!member) {
//     const err = new Error('Member not found');
//     err.status = 404;
//     throw err;
//   }
//   if (
//     !user.roles.includes('SUPER_ADMIN') &&
//     member.brand.organizationId !== user.organizationId
//   ) {
//     const err = new Error('Forbidden');
//     err.status = 403;
//     throw err;
//   }

//   // Prevent owner from removing themselves
//   if (member.userId === user.id) {
//     const err = new Error('Cannot remove yourself from the team');
//     err.status = 400;
//     throw err;
//   }

//   // Soft delete — set status REMOVED
//   await prisma.brandTeamMember.update({
//     where: { id: memberId },
//     data: { status: 'REMOVED' },
//   });

//   // Also remove global BRAND_TEAM_MEMBER role if user has no other org
//   const stillHasOtherBrandMemberships = await prisma.brandTeamMember.count({
//     where: {
//       userId: member.userId,
//       status: { not: 'REMOVED' },
//     },
//   });

//   if (stillHasOtherBrandMemberships === 0) {
//     // User no longer belongs to any brand — detach from organization
//     await prisma.user.update({
//       where: { id: member.userId },
//       data: { organizationId: null },
//     });

//     // Remove BRAND_TEAM_MEMBER global role
//     const teamRole = await prisma.role.findUnique({
//       where: { name: 'BRAND_TEAM_MEMBER' },
//     });
//     if (teamRole) {
//       await prisma.userRole.deleteMany({
//         where: { userId: member.userId, roleId: teamRole.id },
//       });
//     }
//   }

//   return { id: memberId };
// }

// // ======================================================
// // MY MEMBERSHIP (for current user)
// // ======================================================

// async function getMyMembership(user) {
//   if (!user.organizationId) return null;

//   const membership = await prisma.brandTeamMember.findFirst({
//     where: {
//       userId: user.id,
//       status: 'ACTIVE',
//       brand: { organizationId: user.organizationId },
//     },
//     include: {
//       brand: { select: { id: true, name: true, slug: true } },
//       teamRole: true,
//     },
//   });

//   if (!membership) return null;

//   return {
//     id: membership.id,
//     brand: {
//       id: membership.brand.id,
//       name: membership.brand.name,
//       slug: membership.brand.slug,
//     },
//     role: {
//       id: membership.teamRole.id,
//       name: membership.teamRole.name,
//       color: membership.teamRole.color,
//       permissions: membership.teamRole.permissions,
//       isOwnerRole: membership.teamRole.isOwnerRole,
//     },
//     joinedAt: membership.joinedAt,
//   };
// }

// // ======================================================
// // DIRECT ADD — owner adds user by email
// // If user exists → immediately added
// // If user doesn't exist → caller should fall back to invitation
// // ======================================================

// async function directAddMember(user, { brandId = null, email, teamRoleId }) {
//   if (!email || !email.trim()) {
//     const err = new Error('Email is required');
//     err.status = 400;
//     throw err;
//   }
//   if (!teamRoleId) {
//     const err = new Error('Role is required');
//     err.status = 400;
//     throw err;
//   }

//   const normalizedEmail = email.trim().toLowerCase();
//   const brand = await resolveBrand(user, brandId);

//   // Validate role
//   const role = await prisma.brandTeamRole.findUnique({
//     where: { id: teamRoleId },
//   });
//   if (!role || role.brandId !== brand.id) {
//     const err = new Error('Role not found for this brand');
//     err.status = 400;
//     throw err;
//   }

//   // Find the user
//   const targetUser = await prisma.user.findUnique({
//     where: { email: normalizedEmail },
//     include: {
//       brandTeamMemberships: {
//         where: { status: 'ACTIVE' },
//       },
//     },
//   });

//   // ======================================================
//   // CASE 1: USER EXISTS → direct add
//   // ======================================================
//   if (targetUser) {
//     // Check if user is already a member
//     const existing = await prisma.brandTeamMember.findUnique({
//       where: {
//         brandId_userId: { brandId: brand.id, userId: targetUser.id },
//       },
//     });

//     if (existing && existing.status === 'ACTIVE') {
//       const err = new Error('This user is already a member of your brand');
//       err.status = 409;
//       err.code = 'ALREADY_MEMBER';
//       throw err;
//     }

//     // Check user's existing org
//     if (
//       targetUser.organizationId &&
//       targetUser.organizationId !== brand.organizationId
//     ) {
//       const err = new Error(
//         'This user already belongs to another organization and cannot be added'
//       );
//       err.status = 400;
//       throw err;
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Attach to organization
//       await tx.user.update({
//         where: { id: targetUser.id },
//         data: { organizationId: brand.organizationId },
//       });

//       // 2. Add BRAND_TEAM_MEMBER global role (if not present)
//       const teamGlobalRole = await tx.role.findUnique({
//         where: { name: 'BRAND_TEAM_MEMBER' },
//       });
//       const hasGlobalRole = await tx.userRole.findUnique({
//         where: {
//           userId_roleId: {
//             userId: targetUser.id,
//             roleId: teamGlobalRole.id,
//           },
//         },
//       });
//       if (!hasGlobalRole) {
//         await tx.userRole.create({
//           data: { userId: targetUser.id, roleId: teamGlobalRole.id },
//         });
//       }

//       // 3. Create/reactivate BrandTeamMember
//       let membership;
//       if (existing) {
//         membership = await tx.brandTeamMember.update({
//           where: { id: existing.id },
//           data: {
//             teamRoleId: role.id,
//             status: 'ACTIVE',
//             invitedBy: user.id,
//           },
//         });
//       } else {
//         membership = await tx.brandTeamMember.create({
//           data: {
//             brandId: brand.id,
//             userId: targetUser.id,
//             teamRoleId: role.id,
//             status: 'ACTIVE',
//             invitedBy: user.id,
//           },
//         });
//       }

//       // 4. Cancel any pending join request from this user for this brand
//       await tx.brandJoinRequest.updateMany({
//         where: {
//           userId: targetUser.id,
//           brandId: brand.id,
//           status: 'PENDING',
//         },
//         data: { status: 'APPROVED', reviewedBy: user.id, reviewedAt: new Date() },
//       });

//       return membership;
//     });

//     const full = await prisma.brandTeamMember.findUnique({
//       where: { id: result.id },
//       include: {
//         user: { select: { id: true, name: true, email: true } },
//         teamRole: true,
//       },
//     });

//     return {
//       type: 'ADDED',
//       member: shape(full),
//     };
//   }

//   // ======================================================
//   // CASE 2: USER DOESN'T EXIST → return signal to create invitation
//   // ======================================================
//   return {
//     type: 'USER_NOT_FOUND',
//     email: normalizedEmail,
//     roleId: role.id,
//   };
// }

// module.exports = {
//   listMembers,
//   getMember,
//   changeMemberRole,
//   setMemberStatus,
//   removeMember,
//   getMyMembership,
//    directAddMember, 
// };