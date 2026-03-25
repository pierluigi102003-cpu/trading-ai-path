const express = require("express");
const { analyzeProfile } = require("../services/anthropicClient");

const router = express.Router();

router.post("/analyze", async (req, res) => {
  const { budget, exp, risk, goal, time } = req.body;

  try {
    const analysis = await analyzeProfile({ budget, exp, risk, goal, time });
    return res.json({ success: true, data: analysis });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;