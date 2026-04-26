const router = require("express").Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  postArgument,
  replyToArgument,
  listComments,
  reportContent,
  modDeleteArgument
} = require("../controllers/argument.controller");

router.post("/", requireAuth, postArgument);
router.post("/reply", requireAuth, replyToArgument);
router.get("/comments", requireAuth, listComments);
router.post("/report", requireAuth, reportContent);

router.delete("/:id", requireAuth, requireRole("moderator", "admin"), modDeleteArgument);

module.exports = router;

