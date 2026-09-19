const express = require("express");
const router = express.Router();
const db = require("../data/store");

/**
 * GET /cruises
 * Query params: startDate, endDate, startPort, numDays
 * All filters are optional and combinable.
 */
router.get("/", (req, res) => {
  let result = [...db.cruises];
  const { startDate, endDate, startPort, numDays } = req.query;

  if (startDate) {
    result = result.filter((c) => c.startDate >= startDate);
  }
  if (endDate) {
    result = result.filter((c) => c.endDate <= endDate);
  }
  if (startPort) {
    result = result.filter(
      (c) => c.startPort.toLowerCase() === startPort.toLowerCase()
    );
  }
  if (numDays) {
    const days = parseInt(numDays, 10);
    if (!isNaN(days)) {
      result = result.filter((c) => c.numDays === days);
    }
  }

  res.json({ total: result.length, data: result });
});

/**
 * GET /cruises/:id
 * Path param: id = cruiseID (e.g. CRUISE-001)
 */
router.get("/:id", (req, res) => {
  const cruise = db.cruises.find((c) => c.cruiseID === req.params.id);
  if (!cruise) {
    return res
      .status(404)
      .json({ error: "Cruise not found", cruiseID: req.params.id });
  }
  res.json(cruise);
});

module.exports = router;
