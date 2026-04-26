const router = require("express").Router();
const { listArchive } = require("../controllers/archive.controller");

router.get("/", listArchive);

module.exports = router;

