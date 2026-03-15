const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  student_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  suggestion:  { type: String },
}, { timestamps: true });
module.exports = mongoose.model('AIGuidanceLog', schema);
