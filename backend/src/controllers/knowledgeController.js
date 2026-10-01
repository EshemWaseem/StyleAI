const svc = require('../services/knowledge');

async function list(req, res, next) {
  try { res.json(await svc.listDocuments(req.user, req.query)); }
  catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try { res.json({ document: await svc.getDocument(req.user, req.params.id) }); }
  catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const doc = await svc.createDocument(req.user, req.body);
    res.status(201).json({ message: 'Document indexed', document: doc });
  } catch (e) { next(e); }
}

async function reindex(req, res, next) {
  try {
    const r = await svc.reindexDocument(req.user, req.params.id);
    res.json({ message: 'Reindexed', ...r });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const r = await svc.deleteDocument(req.user, req.params.id);
    res.json({ message: 'Deleted', ...r });
  } catch (e) { next(e); }
}

async function search(req, res, next) {
  try {
    const q = req.query.q || req.body?.q || "";
    const result = await svc.search(req.user, q, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json(result);
  } catch (e) { next(e); }
}

async function stats(req, res, next) {
  try { res.json(await svc.stats(req.user)); }
  catch (e) { next(e); }
}

module.exports = { list, getOne, create, reindex, remove, search, stats };