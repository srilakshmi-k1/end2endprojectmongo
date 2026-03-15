const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, default: null },
  role:           { type: String, enum: ['admin', 'counsellor'], default: 'counsellor' },
  branch_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  institution_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', default: null },
  is_active:      { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('User', schema);
