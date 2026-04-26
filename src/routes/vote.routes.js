const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { castVote } = require("../controllers/vote.controller");

router.post("/", requireAuth, castVote);

module.exports = router;

