// controllers/offerController.js
const service = require('../services/offers');

async function create(req, res, next) {
  try {
    const offer = await service.createOffer(req.user, req.body);
    res.status(201).json({ message: 'Offer created', offer });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    res.json(await service.listOffers(req.user, req.query));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const offer = await service.getOffer(req.user, req.params.offerId);
    res.json({ offer });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const offer = await service.updateOffer(req.user, req.params.offerId, req.body);
    res.json({ message: 'Offer updated', offer });
  } catch (err) { next(err); }
}

async function submit(req, res, next) {
  try {
    const offer = await service.submitOffer(req.user, req.params.offerId);
    res.json({ message: 'Offer submitted for admin review', offer });
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    const offer = await service.cancelOffer(req.user, req.params.offerId, {
      reason: req.body?.reason,
    });
    res.json({ message: 'Offer cancelled', offer });
  } catch (err) { next(err); }
}

async function adminReview(req, res, next) {
  try {
    const offer = await service.adminReviewOffer(req.user, req.params.offerId, req.body);
    res.json({ message: 'Offer reviewed', offer });
  } catch (err) { next(err); }
}

async function influencerReview(req, res, next) {
  try {
    const offer = await service.influencerReviewOffer(req.user, req.params.offerId, req.body);
    res.json({ message: 'Offer reviewed', offer });
  } catch (err) { next(err); }
}

async function estimate(req, res, next) {
  try {
    res.json(await service.estimateOfferTotals(req.user, req.body));
  } catch (err) { next(err); }
}

module.exports = {
  create,
  list,
  getOne,
  update,
  submit,
  cancel,
  adminReview,
  influencerReview,
  estimate,
};