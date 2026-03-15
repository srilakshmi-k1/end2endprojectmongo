const csv        = require('csv-parser');
const fs         = require('fs');
const Student    = require('../models/Student');
const Branch     = require('../models/Branch');
const RiskLevel  = require('../models/RiskLevel');
const AILog      = require('../models/AIGuidanceLog');
const { calculateRiskLevel, generateAISuggestions } = require('../services/riskService');

function clean(val) {
  if (!val) return '';
  return val.toString().replace(/^\uFEFF/,'').replace(/\r/g,'').replace(/\u00a0/g,' ').trim();
}

function pick(row, ...keys) {
  for (const k of keys) {
    const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
    if (found && clean(row[found])) return clean(row[found]);
  }
  return '';
}

async function uploadCSV(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Please select a CSV file.' });

  const records = [], errors = [];
  let rowIndex = 0;

  try {
    // Build branch map
    const branches  = await Branch.find();
    const branchMap = {};
    branches.forEach(b => {
      branchMap[b.name.trim().toUpperCase()] = b._id;
      if (b.code) branchMap[b.code.trim().toUpperCase()] = b._id;
      branchMap[b.name.trim().toUpperCase().replace(/&/g,'AND').replace(/  +/g,' ')] = b._id;
    });
    const aliases = {
      'CSE':'COMPUTER SCIENCE & ENGINEERING','CS':'COMPUTER SCIENCE & ENGINEERING',
      'ECE':'ELECTRONICS & COMMUNICATION','EC':'ELECTRONICS & COMMUNICATION',
      'MECH':'MECHANICAL ENGINEERING','ME':'MECHANICAL ENGINEERING','MECHANICAL':'MECHANICAL ENGINEERING',
      'CIVIL':'CIVIL ENGINEERING','CE':'CIVIL ENGINEERING',
      'IT':'INFORMATION TECHNOLOGY',
      'AIDS':'AI & DATA SCIENCE','AI & DS':'AI & DATA SCIENCE',
    };
    Object.entries(aliases).forEach(([alias, full]) => {
      if (!branchMap[alias] && branchMap[full.toUpperCase()])
        branchMap[alias] = branchMap[full.toUpperCase()];
    });

    // Build risk level map
    const riskLevels  = await RiskLevel.find();
    const riskMap     = {};
    riskLevels.forEach(r => { riskMap[r.level_name] = r._id; });

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({ mapHeaders: ({ header }) => clean(header), strict: false }))
        .on('data', row => {
          rowIndex++;
          const serial  = pick(row,'Serial Number','serial_number','Serial','S.No','Sno');
          const name    = pick(row,'Student Name','name','Name','student_name','Full Name');
          const cgpa    = pick(row,'CGPA','cgpa','GPA','gpa');
          const attend  = pick(row,'Attendance','attendance','Attendance %','Attend');
          const email   = pick(row,'Email','email','Email ID');
          const contact = pick(row,'Contact Number','contact_number','Contact','Phone','Mobile');
          const branch  = pick(row,'Branch','branch','Dept','Department').toUpperCase();

          if (!name)   { errors.push({ row: rowIndex, error: `Row ${rowIndex}: Student Name missing.` }); return; }
          if (!cgpa)   { errors.push({ row: rowIndex, error: `Row ${rowIndex}: CGPA missing.` }); return; }
          if (!attend) { errors.push({ row: rowIndex, error: `Row ${rowIndex}: Attendance missing.` }); return; }
          if (!branch) { errors.push({ row: rowIndex, error: `Row ${rowIndex}: Branch missing.` }); return; }

          const cgpaNum   = parseFloat(cgpa);
          const attendNum = parseFloat(attend);

          if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
            errors.push({ row: rowIndex, error: `Row ${rowIndex}: Invalid CGPA "${cgpa}".` }); return;
          }
          if (isNaN(attendNum) || attendNum < 0 || attendNum > 100) {
            errors.push({ row: rowIndex, error: `Row ${rowIndex}: Invalid Attendance "${attend}".` }); return;
          }

          const branchId = branchMap[branch];
          if (!branchId) {
            errors.push({ row: rowIndex, error: `Row ${rowIndex}: Branch "${branch}" not found.` }); return;
          }

          records.push({ serial, name, cgpa: cgpaNum, attendance: attendNum, email, contact, branchId });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (records.length === 0)
      return res.status(400).json({ error: 'No valid records found in CSV.', errors });

    let inserted = 0;
    const institutionId = req.user.institution_id;

    for (const r of records) {
      try {
        const levelName = calculateRiskLevel(r.cgpa, r.attendance);
        const riskId    = riskMap[levelName];
        await Student.create({
          serial_number: r.serial, name: r.name,
          cgpa: r.cgpa, attendance: r.attendance,
          email: r.email, contact_number: r.contact,
          branch_id: r.branchId, institution_id: institutionId,
          risk_level_id: riskId,
        });
        inserted++;
      } catch (e) {
        errors.push({ error: `Failed to insert "${r.name}": ${e.message}` });
      }
    }

    res.json({ message: `Successfully uploaded ${inserted} student(s).`, inserted, errorCount: errors.length, errors });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Server error during upload.', detail: err.message });
  }
}

async function getStudents(req, res) {
  try {
    const Assignment = require('../models/Assignment');
    const students = await Student.find({ institution_id: req.user.institution_id })
      .populate('risk_level_id','level_name')
      .populate('branch_id','name code')
      .sort({ 'risk_level_id': 1, name: 1 });

    const result = await Promise.all(students.map(async s => {
      const asgn = await Assignment.findOne({ student_id: s._id, status:'active' })
        .populate('counsellor_id','name');
      return {
        id: s._id, name: s.name, cgpa: s.cgpa, attendance: s.attendance,
        email: s.email, contact_number: s.contact_number,
        serial_number: s.serial_number,
        level_name:    s.risk_level_id?.level_name,
        branch_name:   s.branch_id?.name,
        branch_code:   s.branch_id?.code,
        counsellor_name: asgn?.counsellor_id?.name || null,
        createdAt: s.createdAt,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

async function getStudent(req, res) {
  try {
    const s = await Student.findById(req.params.id)
      .populate('risk_level_id','level_name')
      .populate('branch_id','name code');
    if (!s) return res.status(404).json({ error: 'Student not found.' });
    res.json({
      id: s._id, name: s.name, cgpa: s.cgpa, attendance: s.attendance,
      email: s.email, contact_number: s.contact_number,
      level_name: s.risk_level_id?.level_name,
      branch_name: s.branch_id?.name, branch_code: s.branch_id?.code,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

async function getUnassigned(req, res) {
  try {
    const Assignment = require('../models/Assignment');
    const assigned = await Assignment.find({ status:'active' }).distinct('student_id');
    const students = await Student.find({
      institution_id: req.user.institution_id,
      _id: { $nin: assigned },
    }).populate('risk_level_id','level_name').populate('branch_id','name code')
      .sort({ name: 1 });

    res.json(students.map(s => ({
      id: s._id, name: s.name, cgpa: s.cgpa, attendance: s.attendance,
      email: s.email, contact_number: s.contact_number,
      level_name: s.risk_level_id?.level_name,
      branch_name: s.branch_id?.name, branch_code: s.branch_id?.code,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

async function getAISuggestion(req, res) {
  try {
    const s = await Student.findById(req.params.id).populate('risk_level_id','level_name');
    if (!s) return res.status(404).json({ error: 'Student not found.' });

    const suggestions = generateAISuggestions({ ...s.toObject(), level_name: s.risk_level_id?.level_name });
    await AILog.create({ student_id: s._id, suggestion: suggestions.join('\n') });

    res.json({ student: s.name, suggestions });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { uploadCSV, getStudents, getStudent, getUnassigned, getAISuggestion };
