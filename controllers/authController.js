const supabase = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.showLogin = (req, res) => {
  res.render('auth/login');
};


exports.showSignup = async (req, res) => {
 const { data: charities, error } = await supabase.from('charities').select('*');

  res.render('auth/signup', { charities });
  
};

exports.signup = async (req, res) => {
  const { name, email, password, charity_id } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const role = email === 'admin@example.com' ? 'admin' : 'user';

  const { data, error } = await supabase
    .from('users')
    .insert([{ 
      name, email, password: hashedPassword, role, 
      charity_id: parseInt(charity_id), 
      charity_percentage: 10 
    }])
    .select()
    .single();

  if (error) return res.send('Signup error: ' + error.message);
  res.redirect('/login');
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (error || !user) return res.send('User not found');
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.send('Wrong password');
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true });
  if (user.role === 'admin') return res.redirect('/admin/dashboard');
  res.redirect('/user/dashboard');
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
};