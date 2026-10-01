// controllers/chatController.js
const svc = require('../services/chat');

async function listConversations(req, res, next) {
  try { res.json(await svc.listMyConversations(req.user, req.query)); }
  catch (e) { next(e); }
}

async function openWith(req, res, next) {
  try {
    const { type, id, context } = req.body || {};
    if (!type || !id) return res.status(400).json({ message: 'type and id required' });
    const c = await svc.getOrCreateConversation(req.user, type, id, context || 'DIRECT');
    res.json({ conversation: c });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try { res.json({ conversation: await svc.getConversation(req.user, req.params.id) }); }
  catch (e) { next(e); }
}

async function listMessages(req, res, next) {
  try { res.json(await svc.listMessages(req.user, req.params.id, req.query)); }
  catch (e) { next(e); }
}

async function sendMessage(req, res, next) {
  try {
    const m = await svc.sendMessage(req.user, req.params.id, req.body);
    res.status(201).json({ message: 'Sent', chatMessage: m });
  } catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try { res.json(await svc.markRead(req.user, req.params.id)); }
  catch (e) { next(e); }
}

async function unread(req, res, next) {
  try { res.json(await svc.getTotalUnread(req.user)); }
  catch (e) { next(e); }
}

// NEW — search parties to start a new chat
async function searchParties(req, res, next) {
  try {
    const svc2 = require('../services/chat/parties');
    res.json(await svc2.searchParties(req.user, req.query));
  } catch (e) { next(e); }
}

module.exports = {
  listConversations, openWith, getOne,
  listMessages, sendMessage, markRead, unread,
  searchParties,
};