const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAllUsers, getAllDebates, getAllMatches, generateDemo, deleteMatch } = require('../controllers/admin.controller');

// Protect all routes
router.use(requireAuth, requireRole('admin', 'moderator'));

router.get('/users', getAllUsers);
router.get('/debates', getAllDebates);
router.get('/matches', getAllMatches);
router.delete('/matches/:id', deleteMatch);
router.post('/demo-debate', generateDemo);

module.exports = router;
