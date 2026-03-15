const Student    = require('../models/Student');
const Assignment = require('../models/Assignment');
const Followup   = require('../models/Followup');
const User       = require('../models/User');
const Branch     = require('../models/Branch');
const RiskLevel  = require('../models/RiskLevel');

async function adminDashboard(req, res) {
  const iid = req.user.institution_id;
  try {
    const [total, high, moderate, safe] = await Promise.all([
      Student.countDocuments({ institution_id: iid }),
      Student.countDocuments({ institution_id: iid }).populate && // fallback via aggregate
        Student.aggregate([
          { $match: { institution_id: require('mongoose').Types.ObjectId.createFromHexString ? require('mongoose').Types.ObjectId.createFromHexString(iid.toString()) : iid } },
          { $lookup: { from:'risklevels', localField:'risk_level_id', foreignField:'_id', as:'risk' } },
          { $unwind:'$risk' },
          { $group: { _id:'$risk.level_name', count:{ $sum:1 } } },
        ]),
    ]);

    // Simpler approach — get risk levels first then count
    const riskLevels  = await RiskLevel.find();
    const riskMap     = {};
    riskLevels.forEach(r => { riskMap[r.level_name] = r._id; });

    const [totalCount, highCount, modCount, safeCount] = await Promise.all([
      Student.countDocuments({ institution_id: iid }),
      Student.countDocuments({ institution_id: iid, risk_level_id: riskMap['High Risk'] }),
      Student.countDocuments({ institution_id: iid, risk_level_id: riskMap['Moderate Risk'] }),
      Student.countDocuments({ institution_id: iid, risk_level_id: riskMap['Safe'] }),
    ]);

    const studentIds   = await Student.find({ institution_id: iid }).distinct('_id');
    const assignedIds  = await Assignment.find({ student_id:{ $in: studentIds }, status:'active' }).distinct('student_id');
    const counsellors  = await User.countDocuments({ institution_id: iid, role:'counsellor', is_active: true });

    // Branch breakdown
    const branches    = await Branch.find();
    const branchData  = await Promise.all(branches.map(async b => {
      const bStudents = await Student.find({ institution_id: iid, branch_id: b._id });
      if (bStudents.length === 0) return null;
      const hc = bStudents.filter(s => s.risk_level_id?.toString() === riskMap['High Risk']?.toString()).length;
      const mc = bStudents.filter(s => s.risk_level_id?.toString() === riskMap['Moderate Risk']?.toString()).length;
      const sc = bStudents.filter(s => s.risk_level_id?.toString() === riskMap['Safe']?.toString()).length;
      return { branch: b.name, code: b.code, count: bStudents.length, high: hc, moderate: mc, safe: sc };
    }));

    // Recent students
    const recentStudents = await Student.find({ institution_id: iid })
      .populate('risk_level_id','level_name')
      .populate('branch_id','name')
      .sort({ createdAt: -1 }).limit(8);

    // Counsellor load
    const counsellorList = await User.find({ institution_id: iid, role:'counsellor', is_active: true });
    const counsellorLoad = await Promise.all(counsellorList.map(async c => {
      const count = await Assignment.countDocuments({ counsellor_id: c._id, status:'active' });
      return { name: c.name, count };
    }));

    res.json({
      stats: {
        total:         totalCount,
        high_risk:     highCount,
        moderate_risk: modCount,
        safe:          safeCount,
        assigned:      assignedIds.length,
        counsellors,
        unassigned:    totalCount - assignedIds.length,
      },
      branchData:     branchData.filter(Boolean),
      recentStudents: recentStudents.map(s => ({
        name: s.name, cgpa: s.cgpa, attendance: s.attendance,
        level_name: s.risk_level_id?.level_name, branch: s.branch_id?.name,
      })),
      counsellorLoad,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
}

async function counsellorDashboard(req, res) {
  try {
    const riskLevels = await RiskLevel.find();
    const riskMap    = {};
    riskLevels.forEach(r => { riskMap[r.level_name] = r._id; });

    const myAssignments = await Assignment.find({ counsellor_id: req.user.id, status:'active' })
      .populate({ path:'student_id', populate:{ path:'risk_level_id', select:'level_name' } });

    const students = myAssignments.map(a => a.student_id);

    const total    = students.length;
    const high     = students.filter(s => s?.risk_level_id?.level_name === 'High Risk').length;
    const moderate = students.filter(s => s?.risk_level_id?.level_name === 'Moderate Risk').length;
    const safe     = students.filter(s => s?.risk_level_id?.level_name === 'Safe').length;
    const followups = await Followup.countDocuments({ counsellor_id: req.user.id });

    res.json({ stats: { total, high, moderate, safe, followups } });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { adminDashboard, counsellorDashboard };
