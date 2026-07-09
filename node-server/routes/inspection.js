const express = require('express');
const router  = express.Router();
const path    = require('path');
const axios   = require('axios');

const { requireAuth } = require('../middleware/auth');
const { upload }      = require('../middleware/upload');
const { analyzeImageWithAI } = require('../utils/vision');
const { isConnected, memoryInspections } = require('../utils/db');
const Inspection = require('../models/Inspection');

const JAVA_API = process.env.JAVA_API_URL;

/**
 * 1. POST /api/inspections/analyze
 * Accepts multipart image, runs AI vision analysis, returns suggested autofill fields.
 */
router.post('/analyze', requireAuth, upload.single('image'), async (req, res) => {
  console.log('\n[Upload BACKEND DEBUG] ─────────────────────────────');
  console.log('[Upload BACKEND] req.file:', req.file);
  console.log('[Upload BACKEND] req.body:', req.body);
  console.log('[Upload BACKEND] Headers content-type:', req.headers['content-type']);
  console.log('[Upload BACKEND] Content-length:', req.headers['content-length']);

  try {
    if (!req.file) {
      console.error('[Upload BACKEND] ERROR: req.file is undefined. Multer did not parse the file.');
      return res.status(400).json({ success: false, message: 'No image file uploaded or file rejected by Multer.' });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    const filename  = req.file.originalname;
    
    // Call the AI Vision (Gemini/Claude) helper
    const aiResult = await analyzeImageWithAI(imagePath, filename);

    // Return the response for auto-filling the frontend form
    res.json({
      success: true,
      data: {
        imageUrl: imagePath,
        filename: filename,
        aiAnalysis: {
          identifiedProduct: aiResult.identifiedProduct,
          productCategory: aiResult.productCategory,
          defectDetected: aiResult.defectDetected,
          defectType: aiResult.defectType,
          severity: aiResult.severity,
          description: aiResult.description,
          confidence: aiResult.confidence,
          suggestedStatus: aiResult.suggestedStatus
        }
      }
    });

  } catch (err) {
    console.error('[AI Analysis Error]', err.message);
    res.status(500).json({ success: false, message: 'AI Vision Analysis failed: ' + err.message });
  }
});

/**
 * 2. POST /api/inspections/save
 * Saves the final reviewed inspection record to MongoDB (or fallback in-memory)
 */
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { 
      productCode, 
      productName,
      identifiedProduct,
      productCategory, 
      status, 
      confidence, 
      recommendation, 
      notes, 
      imageUrl, 
      aiAnalysis, 
      defects 
    } = req.body;

    const inspectionCode = 'INS-' + Date.now().toString().slice(-6);
    
    const recordData = {
      inspectionCode,
      productCode,
      productName: productName || 'Sample Product',
      identifiedProduct,
      productCategory,
      status,
      confidence: confidence || aiAnalysis.confidence || 90,
      recommendation: recommendation || (status === 'Fail' || status === 'DEFECTIVE' ? 'REJECT' : 'ACCEPT'),
      notes,
      imageUrl,
      inspectedBy: req.user?.username || 'admin',
      inspectedAt: new Date(),
      aiAnalysis,
      defects: defects || []
    };

    let savedRecord = null;

    if (isConnected()) {
      // Save to MongoDB
      savedRecord = await Inspection.create(recordData);
      console.log('Saved to MongoDB:', savedRecord.inspectionCode);
    } else {
      // Save to memory
      savedRecord = { id: Date.now(), ...recordData };
      memoryInspections.push(savedRecord);
      console.log('Saved to in-memory fallback:', savedRecord.inspectionCode);
    }

    // Forward to java-mock.js so that the dashboard stats sync up seamlessly
    try {
      await axios.post(`${JAVA_API}/inspections/sync`, savedRecord);
    } catch (e) {
      console.warn('Could not sync with mock Java API stats. Java API is offline.');
    }

    res.json({ success: true, data: savedRecord });

  } catch (err) {
    console.error('[Save Inspection Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to save inspection: ' + err.message });
  }
});

/**
 * GET /api/inspections/history
 * Combines history from MongoDB or memory
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    let content = [];
    if (isConnected()) {
      content = await Inspection.find().sort({ inspectedAt: -1 });
    } else {
      content = [...memoryInspections].reverse();
    }
    
    res.json({
      success: true,
      data: {
        content,
        totalPages: 1,
        totalElements: content.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/inspections/:id
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (isConnected()) {
      const ins = await Inspection.findById(req.params.id);
      if (ins) return res.json({ success: true, data: ins });
    } else {
      const ins = memoryInspections.find(x => x.id == req.params.id);
      if (ins) return res.json({ success: true, data: ins });
    }
    res.status(404).json({ success: false, message: 'Inspection not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/inspections/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (isConnected()) {
      await Inspection.findByIdAndDelete(req.params.id);
    } else {
      memoryInspections = memoryInspections.filter(x => x.id != req.params.id);
    }
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
