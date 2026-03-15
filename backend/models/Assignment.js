const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  student_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  counsellor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  status:        { type: String, enum: ['active', 'closed'], default: 'active' },
  assigned_at:   { type: Date, default: Date.now },
});
module.exports = mongoose.model('Assignment', schema);
