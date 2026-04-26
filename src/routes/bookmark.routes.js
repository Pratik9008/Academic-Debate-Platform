const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { toggleBookmark, listBookmarks } = require("../controllers/bookmark.controller");

router.get("/", requireAuth, listBookmarks);
router.post("/", requireAuth, toggleBookmark);

module.exports = router;

