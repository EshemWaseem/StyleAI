//  backend/src/routes/agencyRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listAgencyClients } = require('../services/agency/context');

router.use(authenticate);

router.get('/clients', async (req, res, next) => {
  try {
    const clients = await listAgencyClients(req.user);
    res.json({ clients });
  } catch (err) { next(err); }
});

module.exports = router;