const router = require("express").Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listDebates,
  listPendingDebates,
  createDebate,
  getDebate,
  approveDebate,
  deleteDebate,
  setRoundState,
  tracking,
  overrideScore
} = require("../controllers/debate.controller");

router.get("/", listDebates);
router.get("/tracking", requireAuth, tracking);
router.get("/pending", requireAuth, requireRole("moderator", "admin"), listPendingDebates);
router.post("/", requireAuth, createDebate);
router.get("/:id", requireAuthOptional, getDebate);
router.post("/:id/approve", requireAuth, requireRole("moderator", "admin"), approveDebate);
router.delete("/:id", requireAuth, requireRole("moderator", "admin"), deleteDebate);
router.post("/:id/round", requireAuth, requireRole("moderator", "admin"), setRoundState);
router.post("/:id/override-score", requireAuth, requireRole("moderator", "admin"), overrideScore);

module.exports = router;

function requireAuthOptional(req, res, next) {
  // Allow viewing debate page without token only if approved+public; controller will guard.
  // For simplicity we attach user if token exists.
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();
  const { requireAuth } = require("../middleware/auth");
  return requireAuth(req, res, next);
}

