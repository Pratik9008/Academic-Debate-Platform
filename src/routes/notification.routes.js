const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { listNotifications, markRead } = require("../controllers/notification.controller");

router.get("/", requireAuth, listNotifications);
router.post("/read", requireAuth, markRead);

module.exports = router;

