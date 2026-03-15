const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  level_name: { type: String, required: true },
  color_code:  { type: String },
});
module.exports = mongoose.model('RiskLevel', schema);
