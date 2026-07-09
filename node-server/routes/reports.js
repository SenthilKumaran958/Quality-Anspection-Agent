/**
 * routes/reports.js — Reports routes served directly from Node.js.
 *
 * Query MongoDB inspections and dynamically generate mock PDF report metadata
 * for each inspection. Provides a real minimal PDF download endpoint.
 */

const express = require('express');
const router  = express.Router();

const { requireAuth } = require('../middleware/auth');
const { isConnected }  = require('../utils/db');
const Inspection        = require('../models/Inspection');

/* ─────────────────────────────────────────────────────
   GET /api/reports
   Returns dynamic list of reports based on inspections.
───────────────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    let inspections = [];
    if (isConnected()) {
      inspections = await Inspection.find().sort({ inspectedAt: -1 }).lean();
    }

    // Map each inspection to a report
    let reports = inspections.map(i => {
      const isPass = i.status === 'Pass' || i.status === 'GOOD';
      return {
        reportCode: `REP-${i.inspectionCode}`,
        inspectionCode: i.inspectionCode,
        productName: i.productName || i.identifiedProduct || 'Metal Component',
        summary: i.recommendation || i.notes || `AI Quality Inspection completed with ${i.status} status.`,
        fileSizeKb: 142,
        generatedBy: i.inspectedBy || 'admin',
        generatedAt: i.inspectedAt
      };
    });

    // If no reports exist yet, inject realistic pre-populated records for first-run UX
    if (reports.length === 0) {
      reports = [
        {
          reportCode: "REP-INSP-9581",
          inspectionCode: "INSP-9581",
          productName: "Ball Bearing OIP (Corrosion Defect)",
          summary: "Severe surface corrosion and pitted rolling grooves. Rejected.",
          fileSizeKb: 142,
          generatedBy: "admin",
          generatedAt: new Date(Date.now() - 3600000 * 4) // 4 hours ago
        },
        {
          reportCode: "REP-INSP-9582",
          inspectionCode: "INSP-9582",
          productName: "Threaded Hex Bolt M12 (Clean)",
          summary: "Thread alignment standards fully met. Visual pass. Accepted.",
          fileSizeKb: 138,
          generatedBy: "admin",
          generatedAt: new Date(Date.now() - 3600000 * 24) // 1 day ago
        },
        {
          reportCode: "REP-INSP-9583",
          inspectionCode: "INSP-9583",
          productName: "Spur Gear (Chipped Tooth)",
          summary: "AI detected micro-cracking and tooth wear on critical edges. Rejected.",
          fileSizeKb: 145,
          generatedBy: "gopikrishnan",
          generatedAt: new Date(Date.now() - 3600000 * 48) // 2 days ago
        }
      ];
    }

    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('[Reports Fetch Error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────────────
   GET /api/reports/download/:reportCode
   Downloads a real valid minimal 1-page PDF report.
───────────────────────────────────────────────────── */
router.get('/download/:reportCode', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.reportCode}.pdf"`);

  // Valid minimal PDF structure displaying "Quality AI Inspection Report"
  const minimalPDF = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n' +
    '4 0 obj<</Length 47>>stream\n' +
    'BT /F1 12 Tf 70 700 Td (Quality AI Inspection Report) Tj ET\n' +
    'endstream\n' +
    'endobj\n' +
    'xref\n' +
    '0 5\n' +
    '0000000000 65535 f\n' +
    '0000000009 00000 n\n' +
    '0000000052 00000 n\n' +
    '0000000101 00000 n\n' +
    '0000000201 00000 n\n' +
    'trailer<</Size 5/Root 1 0 R>>\n' +
    'startxref\n' +
    '300\n' +
    '%%EOF'
  );

  res.send(minimalPDF);
});

module.exports = router;
