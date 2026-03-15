const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  student_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  counsellor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  note:          { type: String, required: true },
  follow_date:   { type: Date,   required: true },
}, { timestamps: true });
module.exports = mongoose.model('Followup', schema);
