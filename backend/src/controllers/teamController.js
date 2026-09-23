const teamService = require('../services/teamService');

// ======================================================
// GET /api/teams  → list teams (scoped to user's org)
// ======================================================
async function list(req, res, next) {
  try {
    const teams = await teamService.listTeams(req.user);
    res.json({ count: teams.length, teams });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// GET /api/teams/:teamId  → get one team (with members)
// ======================================================
async function getOne(req, res, next) {
  try {
    const team = await teamService.getTeam(req.user, req.params.teamId);
    res.json({ team });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/teams  → create team
// Body: { name, description? }
// ======================================================
async function create(req, res, next) {
  try {
    const team = await teamService.createTeam(req.user, req.body);
    res.status(201).json({ message: 'Team created', team });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// PATCH /api/teams/:teamId  → update team
// ======================================================
async function update(req, res, next) {
  try {
    const team = await teamService.updateTeam(
      req.user,
      req.params.teamId,
      req.body
    );
    res.json({ message: 'Team updated', team });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// DELETE /api/teams/:teamId  → delete team
// ======================================================
async function remove(req, res, next) {
  try {
    const result = await teamService.deleteTeam(req.user, req.params.teamId);
    res.json({ message: 'Team deleted', ...result });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/teams/:teamId/members  → add member
// Body: { userId }
// ======================================================
async function addMember(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId required' });
    }
    const member = await teamService.addMember(
      req.user,
      req.params.teamId,
      userId
    );
    res.status(201).json({ message: 'Member added', member });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// DELETE /api/teams/:teamId/members/:userId  → remove member
// ======================================================
async function removeMember(req, res, next) {
  try {
    const result = await teamService.removeMember(
      req.user,
      req.params.teamId,
      req.params.userId
    );
    res.json({ message: 'Member removed', ...result });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// GET /api/teams/:teamId/available-users  → users not yet in team
// ======================================================
async function listAvailableUsers(req, res, next) {
  try {
    const users = await teamService.listAvailableUsers(
      req.user,
      req.params.teamId
    );
    res.json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  addMember,
  removeMember,
  listAvailableUsers,
};