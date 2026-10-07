const svc = require('../services/campaigns');

async function submitRaw(req, res, next) {
  try {
    const d = await svc.submitRawContent(req.user, req.params.deliverableId, req.body);
    res.json({ message: 'Raw content submitted', deliverable: d });
  } catch (e) { next(e); }
}

async function startEditing(req, res, next) {
  try {
    const d = await svc.startEditing(req.user, req.params.deliverableId);
    res.json({ message: 'Editing started', deliverable: d });
  } catch (e) { next(e); }
}

async function submitFinal(req, res, next) {
  try {
    const d = await svc.submitFinalContent(req.user, req.params.deliverableId, req.body);
    res.json({ message: 'Final content submitted', deliverable: d });
  } catch (e) { next(e); }
}

async function approve(req, res, next) {
  try {
    const d = await svc.approveContent(req.user, req.params.deliverableId);
    res.json({ message: 'Content approved', deliverable: d });
  } catch (e) { next(e); }
}

async function reject(req, res, next) {
  try {
    const d = await svc.rejectContent(req.user, req.params.deliverableId, req.body);
    res.json({ message: 'Content rejected', deliverable: d });
  } catch (e) { next(e); }
}

async function publish(req, res, next) {
  try {
    const d = await svc.publishContent(req.user, req.params.deliverableId, req.body);
    res.json({ message: 'Content published', deliverable: d });
  } catch (e) { next(e); }
}

async function metrics(req, res, next) {
  try {
    const d = await svc.enterMetrics(req.user, req.params.deliverableId, req.body);
    res.json({ message: 'Metrics recorded', deliverable: d });
  } catch (e) { next(e); }
}

async function submitFinalAsInfluencer(req, res, next) {
  try {
    const d = await svc.submitFinalAsInfluencer(
      req.user,
      req.params.deliverableId,
      req.body
    );
    res.json({ message: 'Final content submitted', deliverable: d });
  } catch (e) { next(e); }
}


module.exports = { submitRaw, startEditing, submitFinal, approve, reject, submitFinalAsInfluencer, publish, metrics };