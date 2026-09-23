const roleService = require('../services/brandTeamRoleService');
const memberService = require('../services/brandTeamMemberService');
const invitationService = require('../services/invitationService');

// ======================================================
// ROLES
// ======================================================

async function listRoles(req, res, next) {
  try {
    const roles = await roleService.listRoles(req.user, req.query.brandId);
    res.json({ count: roles.length, roles });
  } catch (err) {
    next(err);
  }
}

async function getRole(req, res, next) {
  try {
    const role = await roleService.getRole(req.user, req.params.roleId);
    res.json({ role });
  } catch (err) {
    next(err);
  }
}

async function createRole(req, res, next) {
  try {
    const role = await roleService.createRole(req.user, req.body);
    res.status(201).json({ message: 'Role created', role });
  } catch (err) {
    next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const role = await roleService.updateRole(req.user, req.params.roleId, req.body);
    res.json({ message: 'Role updated', role });
  } catch (err) {
    next(err);
  }
}

async function deleteRole(req, res, next) {
  try {
    const result = await roleService.deleteRole(req.user, req.params.roleId);
    res.json({ message: 'Role deleted', ...result });
  } catch (err) {
    next(err);
  }
}

async function listPermissions(req, res, next) {
  try {
    const catalog = roleService.getPermissionCatalog();
    res.json(catalog);
  } catch (err) {
    next(err);
  }
}

// ======================================================
// MEMBERS
// ======================================================

async function listMembers(req, res, next) {
  try {
    const members = await memberService.listMembers(req.user, req.query.brandId);
    res.json({ count: members.length, members });
  } catch (err) {
    next(err);
  }
}

async function getMember(req, res, next) {
  try {
    const member = await memberService.getMember(req.user, req.params.memberId);
    res.json({ member });
  } catch (err) {
    next(err);
  }
}

async function changeRole(req, res, next) {
  try {
    const { teamRoleId } = req.body;
    if (!teamRoleId) {
      return res.status(400).json({ message: 'teamRoleId required' });
    }
    const member = await memberService.changeMemberRole(
      req.user,
      req.params.memberId,
      teamRoleId
    );
    res.json({ message: 'Member role updated', member });
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const { status } = req.body;
    const member = await memberService.setMemberStatus(
      req.user,
      req.params.memberId,
      status
    );
    res.json({ message: 'Member status updated', member });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const result = await memberService.removeMember(req.user, req.params.memberId);
    res.json({ message: 'Member removed', ...result });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// DIRECT ADD — smart: adds user OR creates invitation
// ======================================================

async function directAdd(req, res, next) {
  try {
    const { email, teamRoleId, brandId, message } = req.body || {};

    if (!email || !teamRoleId) {
      return res
        .status(400)
        .json({ message: 'email and teamRoleId are required' });
    }

    // 1. Attempt direct add
    const result = await memberService.directAddMember(req.user, {
      brandId,
      email,
      teamRoleId,
    });

    // 2a. User exists → directly added
    if (result.type === 'ADDED') {
      return res.status(201).json({
        type: 'ADDED',
        message: 'Member added successfully',
        member: result.member,
      });
    }

    // 2b. User doesn't exist → auto-create invitation
    if (result.type === 'USER_NOT_FOUND') {
      const invite = await invitationService.createInvitation(req.user, {
        email: result.email,
        teamRoleId: result.roleId,
        message,
      });

      return res.status(201).json({
        type: 'INVITED',
        message:
          'No account found for this email. An invitation has been created.',
        invitation: invite,
      });
    }

    // Fallback (shouldn't happen)
    next(new Error('Unexpected direct-add result'));
  } catch (err) {
    if (err.code === 'NO_BRAND') {
      return res.status(400).json({ message: err.message, code: 'NO_BRAND' });
    }
    if (err.code === 'ALREADY_MEMBER') {
      return res
        .status(409)
        .json({ message: err.message, code: 'ALREADY_MEMBER' });
    }
    next(err);
  }
}

// ======================================================
// ME
// ======================================================

async function getMyMembership(req, res, next) {
  try {
    const membership = await memberService.getMyMembership(req.user);
    res.json({ membership });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Roles
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  // Members
  listMembers,
  getMember,
  changeRole,
  setStatus,
  removeMember,
  // Direct add
  directAdd,
  // Me
  getMyMembership,
};