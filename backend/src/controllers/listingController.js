// controllers/listingController.js
const svc = require('../services/listings');

async function create(req, res, next) {
  try {
    const listing = await svc.createListing(req.user, req.body);
    res.status(201).json({ message: 'Listing created', listing });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const result = await svc.listListings(req.user, req.query);
    res.json(result);
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const listing = await svc.getListing(req.user, req.params.id);
    res.json({ listing });
  } catch (e) { next(e); }
}

async function cancel(req, res, next) {
  try {
    const listing = await svc.cancelListing(req.user, req.params.id);
    res.json({ message: 'Listing cancelled', listing });
  } catch (e) { next(e); }
}

async function claim(req, res, next) {
  try {
    const result = await svc.claimListing(req.user, req.params.id, req.body);
    res.json({ message: 'Listing claimed', ...result });
  } catch (e) { next(e); }
}

module.exports = { create, list, getOne, cancel, claim };