const invitationService = require('../services/invitationService');

async function create(req, res, next) {
  try {
    const invitation = await invitationService.createInvitation(req.user, req.body);
    res.status(201).json({ message: 'Invitation created', invitation });
  } catch (err) {
    if (err.code === 'NO_BRAND') {
      return res.status(400).json({ message: err.message, code: 'NO_BRAND' });
    }
    next(err);
  }
}

async function listSent(req, res, next) {
  try {
    const invitations = await invitationService.listSent(req.user);
    res.json({ count: invitations.length, invitations });
  } catch (err) {
    next(err);
  }
}

async function listReceived(req, res, next) {
  try {
    const invitations = await invitationService.listReceived(req.user);
    res.json({ count: invitations.length, invitations });
  } catch (err) {
    next(err);
  }
}

async function getByToken(req, res, next) {
  try {
    const invitation = await invitationService.getByToken(req.params.token);
    res.json({ invitation });
  } catch (err) {
    next(err);
  }
}

async function accept(req, res, next) {
  try {
    const result = await invitationService.accept(req.user, req.params.token);
    res.json({ message: 'Invitation accepted', ...result });
  } catch (err) {
    next(err);
  }
}

async function decline(req, res, next) {
  try {
    const result = await invitationService.decline(req.user, req.params.token);
    res.json({ message: 'Invitation declined', ...result });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const result = await invitationService.cancel(req.user, req.params.id);
    res.json({ message: 'Invitation cancelled', ...result });
  } catch (err) {
    next(err);
  }
}

async function redeem(req, res, next) {
  try {
    const { code } = req.body || {};
    const result = await invitationService.redeemByToken(req.user, code);
    res.json({ message: 'Invitation redeemed', ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  listSent,
  listReceived,
  getByToken,
  accept,
  decline,
  cancel,
  redeem,
};