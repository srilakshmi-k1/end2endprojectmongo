const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const Institution = require('../models/Institution');
const User        = require('../models/User');
const Branch      = require('../models/Branch');

const JWT_SECRET = process.env.JWT_SECRET || 'edusafeguard_jwt_secret_v2';

async function adminRegister(req, res) {
  const { institution_name, email, password, confirm_password } = req.body;
  if (!institution_name || !email || !password || !confirm_password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (password !== confirm_password)
    return res.status(400).json({ error: 'Passwords do not match.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    if (await User.findOne({ email }))
      return res.status(400).json({ error: 'Email already registered.' });

    const institution = await Institution.create({ name: institution_name });
    const hashed      = await bcrypt.hash(password, 10);

    await User.create({
      name: institution_name + ' Admin',
      email, password: hashed,
      role: 'admin', is_active: true,
      institution_id: institution._id,
    });

    res.json({ message: 'Admin registered successfully. Please login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
}

async function login(req, res) {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ error: 'Email, password and role are required.' });

  try {
    const user = await User.findOne({ email, role })
      .populate('institution_id', 'name')
      .populate('branch_id', 'name code');

    if (!user)
      return res.status(401).json({ error: 'Invalid credentials.' });
    if (!user.is_active || !user.password)
      return res.status(403).json({ error: 'Account not activated. Please activate your account first.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      {
        id: user._id, email: user.email, role: user.role, name: user.name,
        institution_id: user.institution_id?._id,
        branch_id: user.branch_id?._id,
      },
      JWT_SECRET,
      { expiresIn: '10h' }
    );

    res.json({
      token,
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        institution_id:   user.institution_id?._id,
        institution_name: user.institution_id?.name,
        branch_id:        user.branch_id?._id,
        branch_name:      user.branch_id?.name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
}

async function activateCounsellor(req, res) {
  const { email, password, confirm_password } = req.body;
  if (!email || !password || !confirm_password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (password !== confirm_password)
    return res.status(400).json({ error: 'Passwords do not match.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const user = await User.findOne({ email, role: 'counsellor' });
    if (!user)
      return res.status(404).json({ error: 'No counsellor account found with this email.' });
    if (user.password)
      return res.status(400).json({ error: 'Account already activated. Please login.' });

    user.password  = await bcrypt.hash(password, 10);
    user.is_active = true;
    await user.save();

    res.json({ message: 'Account activated successfully. You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
}

async function addCounsellor(req, res) {
  const { name, email, branch_id } = req.body;
  if (!name || !email || !branch_id)
    return res.status(400).json({ error: 'Name, email and branch are required.' });

  try {
    if (await User.findOne({ email }))
      return res.status(400).json({ error: 'Email already registered.' });

    await User.create({
      name, email, password: null,
      role: 'counsellor', is_active: false,
      branch_id, institution_id: req.user.institution_id,
    });

    res.json({ message: `Counsellor ${name} added. They can now activate their account using their email.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
}

async function getCounsellors(req, res) {
  try {
    const counsellors = await User.find({
      role: 'counsellor',
      institution_id: req.user.institution_id,
    }).populate('branch_id', 'name code').sort({ createdAt: -1 });

    const Assignment = require('../models/Assignment');
    const result = await Promise.all(counsellors.map(async (c) => {
      const count = await Assignment.countDocuments({ counsellor_id: c._id, status: 'active' });
      return {
        _id: c._id, id: c._id, name: c.name, email: c.email,
        is_active: c.is_active, created_at: c.createdAt,
        branch_name: c.branch_id?.name, branch_code: c.branch_id?.code,
        assigned_count: count,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

async function getBranches(req, res) {
  try {
    const branches = await Branch.find().sort({ name: 1 });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { adminRegister, login, activateCounsellor, addCounsellor, getCounsellors, getBranches };
