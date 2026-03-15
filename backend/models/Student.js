const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  serial_number:  { type: String },
  name:           { type: String, required: true },
  cgpa:           { type: Number, required: true },
  attendance:     { type: Number, required: true },
  email:          { type: String },
  contact_number: { type: String },
  branch_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  institution_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  risk_level_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'RiskLevel', required: true },
}, { timestamps: true });
module.exports = mongoose.model('Student', schema);
