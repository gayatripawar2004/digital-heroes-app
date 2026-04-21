const supabase = require('../config/db');
const scoreController = require('./scoreController');

exports.dashboard = async (req, res) => {
  const userId = req.user.id;

  
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  
  const scores = await scoreController.getScores(req, res);

 
  const { data: userCharity } = await supabase
    .from('user_charities')
    .select('charity_id, percentage')
    .eq('user_id', userId)
    .single();
  let charity = null;
  if (userCharity) {
    const { data: c } = await supabase.from('charities').select('*').eq('id', userCharity.charity_id).single();
    charity = { ...c, percentage: userCharity.percentage };
  }

  
  const { data: draws } = await supabase.from('draws').select('*').order('created_at', { ascending: false });

 
  const { data: winnings } = await supabase
    .from('winners')
    .select('amount, status')
    .eq('user_id', userId);
  let totalWon = 0;
  if (winnings) totalWon = winnings.reduce((sum, w) => sum + w.amount, 0);

  res.render('user/dashboard', { user: req.user, subscription: sub, scores, charity, draws, winnings, totalWon });
};

exports.subscribe = async (req, res) => {
  const { plan } = req.body; 
  const userId = req.user.id;
  const expiryDate = new Date();
  if (plan === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
  else expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    status: 'active',
    plan,
    expiry_date: expiryDate.toISOString().split('T')[0]
  });
  if (error) return res.send('Subscription error: ' + error.message);
  res.redirect('/user/dashboard');
};

exports.updateCharity = async (req, res) => {
  const { charity_id, percentage } = req.body;
  const userId = req.user.id;
  await supabase.from('user_charities').upsert({ user_id: userId, charity_id, percentage: parseInt(percentage) });
  res.redirect('/user/dashboard');
};

exports.showSubscribeForm = (req, res) => {
  res.render('user/subscribe');
};

exports.createSubscription = async (req, res) => {
  const { plan } = req.body; 
  const userId = req.user.id;

  let expiryDate = new Date();
  if (plan === 'monthly') {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      status: 'active',
      plan: plan,
      expiry_date: expiryDate.toISOString().split('T')[0],
      updated_at: new Date()
    }, { onConflict: 'user_id' });

  if (error) return res.send('Subscription error: ' + error.message);
  res.redirect('/user/dashboard');
};