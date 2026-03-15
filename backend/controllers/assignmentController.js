const Assignment = require('../models/Assignment');
const Student    = require('../models/Student');
const User       = require('../models/User');

async function assignStudent(req, res) {
  const { student_id, counsellor_id } = req.body;
  if (!student_id || !counsellor_id)
    return res.status(400).json({ error: 'student_id and counsellor_id are required.' });

  try {
    const existing = await Assignment.findOne({ student_id, status: 'active' });
    if (existing)
      return res.status(400).json({ error: 'Student is already assigned to a counsellor.' });

    await Assignment.create({ student_id, counsellor_id, status: 'active' });
    res.json({ message: 'Student assigned successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

async function bulkAssign(req, res) {
  const { assignments } = req.body;
  if (!Array.isArray(assignments) || assignments.length === 0)
    return res.status(400).json({ error: 'assignments array required.' });

  let success = 0, skipped = 0;
  for (const a of assignments) {
    const ex = await Assignment.findOne({ student_id: a.student_id, status: 'active' });
    if (ex) { skipped++; continue; }
    await Assignment.create({ student_id: a.student_id, counsellor_id: a.counsellor_id, status: 'active' });
    success++;
  }
  res.json({ message: `${success} assigned, ${skipped} already had assignments.` });
}

async function getMyCounsellees(req, res) {
  try {
    const assignments = await Assignment.find({ counsellor_id: req.user.id, status: 'active' })
      .populate({
        path: 'student_id',
        populate: [
          { path: 'risk_level_id', select: 'level_name' },
          { path: 'branch_id',     select: 'name code'  },
        ],
      })
      .sort({ assigned_at: -1 });

    res.json(assignments.map(a => {
      const s = a.student_id;
      return {
        id: s._id, name: s.name, cgpa: s.cgpa, attendance: s.attendance,
        email: s.email, contact_number: s.contact_number,
        level_name:  s.risk_level_id?.level_name,
        branch_name: s.branch_id?.name, branch_code: s.branch_id?.code,
        assignment_id: a._id, assigned_at: a.assigned_at,
      };
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

async function getAllAssignments(req, res) {
  try {
    const studentIds = await Student.find({ institution_id: req.user.institution_id }).distinct('_id');
    const assignments = await Assignment.find({ student_id: { $in: studentIds } })
      .populate('student_id', 'name cgpa attendance')
      .populate('counsellor_id', 'name')
      .populate({ path: 'student_id', populate: [{ path:'risk_level_id', select:'level_name' }, { path:'branch_id', select:'name' }] })
      .sort({ assigned_at: -1 });

    res.json(assignments.map(a => ({
      id: a._id, assigned_at: a.assigned_at, status: a.status,
      student_name:    a.student_id?.name,
      cgpa:            a.student_id?.cgpa,
      attendance:      a.student_id?.attendance,
      counsellor_name: a.counsellor_id?.name,
      level_name:      a.student_id?.risk_level_id?.level_name,
      branch_name:     a.student_id?.branch_id?.name,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { assignStudent, bulkAssign, getMyCounsellees, getAllAssignments };
