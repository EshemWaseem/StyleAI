/**
 * Influencer service — barrel export.
 */

const { listInfluencers } = require('./list');
const { getInfluencer, getMyInfluencerProfile } = require('./get');
const { createInfluencer } = require('./create');
const { updateInfluencer } = require('./update');
const { deleteInfluencer } = require('./delete');
const { saveInfluencer, unsaveInfluencer } = require('./bookmark');

module.exports = {
  listInfluencers,
  getInfluencer,
  getMyInfluencerProfile,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
  saveInfluencer,
  unsaveInfluencer,
};