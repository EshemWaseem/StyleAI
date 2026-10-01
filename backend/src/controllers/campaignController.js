const svc = require('../services/campaigns');

async function list(req, res, next) {
  try { res.json(await svc.listCampaigns(req.user, req.query)); }
  catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try { res.json({ campaign: await svc.getCampaign(req.user, req.params.id) }); }
  catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const campaign = await svc.updateCampaign(req.user, req.params.id, req.body);
    res.json({ message: 'Campaign updated', campaign });
  } catch (e) { next(e); }
}

async function complete(req, res, next) {
  try {
    const campaign = await svc.completeCampaign(req.user, req.params.id);
    res.json({ message: 'Campaign completed', campaign });
  } catch (e) { next(e); }
}

module.exports = { list, getOne, update, complete };