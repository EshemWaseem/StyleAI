// controllers/assistantController.js
const svc = require('../services/assistant');

async function chat(req, res, next) {
  try {
    const result = await svc.chat(req.user, req.body);
    res.json(result);
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const conversations = await svc.listConversations(req.user);
    res.json({ conversations });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const conversation = await svc.getConversation(req.user, req.params.id);
    res.json(conversation);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const result = await svc.deleteConversation(req.user, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = { chat, list, getOne, remove };