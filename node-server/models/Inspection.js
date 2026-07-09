const mongoose = require('mongoose');

const InspectionSchema = new mongoose.Schema({
  inspectionCode: { type: String, required: true, unique: true },
  productCode: { type: String }, // Now optional
  productName: { type: String }, // Now optional
  identifiedProduct: { type: String }, // AI detected product
  productCategory: { type: String }, // AI detected category
  status: { type: String, enum: ['GOOD', 'DEFECTIVE', 'Pass', 'Fail', 'Needs Manual Review', 'Pending'], required: true },
  confidence: { type: Number, required: true },
  recommendation: { type: String },
  notes: { type: String },
  imageUrl: { type: String },
  inspectedBy: { type: String, default: 'admin' },
  inspectedAt: { type: Date, default: Date.now },
  aiAnalysis: {
    defectDetected: { type: Boolean },
    defectType: { type: String },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
    description: { type: String },
    confidence: { type: Number }
  },
  defects: [{
    defectType: { type: String },
    severity: { type: String },
    description: { type: String },
    bboxX: { type: Number },
    bboxY: { type: Number },
    bboxWidth: { type: Number },
    bboxHeight: { type: Number }
  }]
});

// Avoid model recompilation errors in development
module.exports = mongoose.models.Inspection || mongoose.model('Inspection', InspectionSchema);
