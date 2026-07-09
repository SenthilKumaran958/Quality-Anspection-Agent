/**
 * routes/dashboard.js — Dashboard stats routes served directly from Node.js.
 */

const express = require('express');
const router  = express.Router();

const { requireAuth } = require('../middleware/auth');
const { isConnected, memoryInspections } = require('../utils/db');
const Inspection = require('../models/Inspection');

/* ─────────────────────────────────────────────────────
   GET /api/dashboard/stats
   Returns aggregate counts and recent inspections for dashboard.
───────────────────────────────────────────────────── */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    let all = [];
    if (isConnected()) {
      all = await Inspection.find().sort({ inspectedAt: -1 }).lean();
    } else {
      all = [...memoryInspections].sort((a, b) => new Date(b.inspectedAt) - new Date(a.inspectedAt));
    }

    const totalInspected = all.length;
    const goodProducts   = all.filter(i => i.status === 'Pass' || i.status === 'GOOD').length;
    const defectiveProducts = all.filter(i => i.status === 'Fail' || i.status === 'DEFECTIVE').length;
    
    // Default mock accuracy
    const detectionAccuracy = totalInspected > 0 ? "98.2" : "95.4";
    const recentInspections = all.slice(0, 5);

    res.json({
      success: true,
      data: {
        totalInspected,
        goodProducts,
        defectiveProducts,
        detectionAccuracy,
        recentInspections
      }
    });

  } catch (err) {
    console.error('[Dashboard Stats Error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
