const svc = require('../services/campaigns');

async function list(req, res, next) {
  try { res.json(await svc.listChatMessages(req.user, req.params.id, req.query)); }
  catch (e) { next(e); }
}

async function send(req, res, next) {
  try {
    const message = await svc.sendChatMessage(req.user, req.params.id, req.body);
    res.status(201).json({ message: 'Sent', chatMessage: message });
  } catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try { res.json(await svc.markChatRead(req.user, req.params.id)); }
  catch (e) { next(e); }
}

async function unread(req, res, next) {
  try { res.json(await svc.getChatUnreadCount(req.user, req.params.id)); }
  catch (e) { next(e); }
}

async function unreadTotal(req, res, next) {
  try {
    const svc = require('../services/campaigns');
    res.json(await svc.getTotalUnreadForUser(req.user));
  } catch (e) { next(e); }
}

module.exports = { list, send, markRead, unread, unreadTotal };

// module.exports = { list, send, markRead, unread };