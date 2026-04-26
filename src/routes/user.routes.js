const router = require("express").Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { me, updateProfile, leaderboard, participation } = require("../controllers/user.controller");
const { banUser } = require("../controllers/moderation.controller");

router.get("/me", requireAuth, me);
router.put("/me", requireAuth, updateProfile);
router.get("/leaderboard", leaderboard);
router.get("/me/participation", requireAuth, participation);

router.post("/ban", requireAuth, requireRole("moderator", "admin"), banUser);

module.exports = router;

