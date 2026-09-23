const joinRequestService = require('../services/joinRequestService');

async function create(req, res, next) {
  try {
    const request = await joinRequestService.createRequest(req.user, req.body);
    res.status(201).json({ message: 'Request sent', request });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const requests = await joinRequestService.listMine(req.user);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
}

async function listPending(req, res, next) {
  try {
    const requests = await joinRequestService.listForBrandOwner(req.user, {
      status: req.query.status || 'PENDING',
    });
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const { approvedRoleId } = req.body || {};
    const request = await joinRequestService.approve(
      req.user,
      req.params.id,
      { approvedRoleId }
    );
    res.json({ message: 'Request approved', request });
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const request = await joinRequestService.reject(
      req.user,
      req.params.id,
      req.body.reason
    );
    res.json({ message: 'Request rejected', request });
  } catch (err) {
    next(err);
  }
}

async function cancelMine(req, res, next) {
  try {
    const result = await joinRequestService.cancelMine(req.user, req.params.id);
    res.json({ message: 'Request cancelled', ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMine, listPending, approve, reject, cancelMine };