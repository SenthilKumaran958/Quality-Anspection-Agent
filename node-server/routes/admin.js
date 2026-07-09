/**
 * routes/admin.js — Admin routes served directly from Node.js.
 *
 * These routes do NOT proxy to Java. They query MongoDB directly
 * (with in-memory fallback) so the admin panel works even without
 * the Java Spring Boot backend running.
 */

const express = require('express');
const router  = express.Router();

const { requireAuth } = require('../middleware/auth');
const { isConnected }  = require('../utils/db');
const Inspection        = require('../models/Inspection');

// In-memory user store (shared with auth.js fallback)
// In a real app this would be a MongoDB User model.
const LOCAL_USERS = [
  { id: 1, username: 'admin',    fullName: 'Administrator', email: 'admin@quality.ai',    role: 'ADMIN',    isActive: true,  totalInspections: 0 },
];

/* ─────────────────────────────────────────────────────
   GET /api/admin/stats
   Returns aggregate stats for the admin panel header cards.
───────────────────────────────────────────────────── */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    if (isConnected()) {
      const totalInspections = await Inspection.countDocuments();
      const defectiveCount   = await Inspection.countDocuments({
        status: { $in: ['DEFECTIVE', 'Fail'] }
      });

      // Defect type breakdown
      const defectTrendsRaw = await Inspection.aggregate([
        { $match: { 'aiAnalysis.defectType': { $exists: true, $ne: null, $ne: 'None' } } },
        { $group: { _id: '$aiAnalysis.defectType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      const defectTrends = defectTrendsRaw.map(d => ({
        defectType: d._id,
        count: d.count
      }));

      return res.json({
        success: true,
        data: {
          totalUsers: LOCAL_USERS.filter(u => u.isActive).length,
          totalInspections,
          totalDefective: defectiveCount,
          totalReports: Math.ceil(totalInspections / 5), // approximate
          defectTrends
        }
      });
    }

    // In-memory fallback
    return res.json({
      success: true,
      data: {
        totalUsers: LOCAL_USERS.length,
        totalInspections: 0,
        totalDefective: 0,
        totalReports: 0,
        defectTrends: []
      }
    });

  } catch (err) {
    console.error('[Admin Stats Error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────
   GET /api/admin/users
   Returns list of all users.
───────────────────────────────────────────────────── */
router.get('/users', requireAuth, async (req, res) => {
  try {
    // Enrich local users with inspection count from MongoDB
    if (isConnected()) {
      const enriched = await Promise.all(LOCAL_USERS.map(async (u) => {
        const count = await Inspection.countDocuments({ inspectedBy: u.username });
        return { ...u, totalInspections: count };
      }));
      return res.json({ success: true, data: enriched });
    }

    res.json({ success: true, data: LOCAL_USERS });
  } catch (err) {
    console.error('[Admin Users Error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────
   PUT /api/admin/users/:id/toggle
   Toggle a user's active status.
───────────────────────────────────────────────────── */
router.put('/users/:id/toggle', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user   = LOCAL_USERS.find(u => u.id === userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────
   GET /api/admin/inspections
   Returns all inspections for admin review.
───────────────────────────────────────────────────── */
router.get('/inspections', requireAuth, async (req, res) => {
  try {
    if (isConnected()) {
      const inspections = await Inspection.find()
        .sort({ inspectedAt: -1 })
        .limit(100)
        .lean();
      return res.json({ success: true, data: inspections });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
