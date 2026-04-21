const supabase = require('../config/db');

exports.dashboard = async (req, res) => {
  // userCount
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // draws
  const { data: draws } = await supabase
    .from('draws')
    .select('*')
    .order('created_at', { ascending: false });

  // winners
  const { data: winners } = await supabase
    .from('winners')
    .select(`
      *,
      users (name, email),
      draws (result, created_at)
    `)
    .order('created_at', { ascending: false });

  // एकूण prize pool (सोप्या पद्धतीने सर्व winners ची amount बेरीज)
  const { data: prizeData } = await supabase
    .from('winners')
    .select('amount');
  let totalPrizePool = 0;
  if (prizeData) {
    totalPrizePool = prizeData.reduce((sum, w) => sum + w.amount, 0);
  }

  // एकूण charity contributions (उदा. subscriptions मधून 10% साधारण)
  const { data: charityData } = await supabase
    .from('user_charities')
    .select('percentage');
  let charityTotal = 0;
  // सोपा अंदाज: प्रत्येक active subscription $10/month गृहीत धरून
  const { count: activeSubs } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  charityTotal = (activeSubs || 0) * 10 * 0.10; // $1 per active user per month

  const drawsCount = draws ? draws.length : 0;

  res.render('admin/dashboard', { 
    userCount, 
    draws, 
    winners,
    totalPrizePool,
    charityTotal,
    drawsCount
  });
};

exports.runDraw = async (req, res) => {
  // 1. सर्व active subscribers मिळवा (ज्यांची subscription active आहे)
  const { data: activeUsers, error: userError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')
    .gte('expiry_date', new Date().toISOString().split('T')[0]);

  if (userError || !activeUsers || activeUsers.length === 0) {
    return res.send('No active subscribers to run draw.');
  }

  // 2. एक यादृच्छिक user निवडा
  const randomIndex = Math.floor(Math.random() * activeUsers.length);
  const winnerUserId = activeUsers[randomIndex].user_id;

  // 3. नवीन draw रेकॉर्ड तयार करा
  const { data: draw, error: drawError } = await supabase
    .from('draws')
    .insert([{ result: 'Random winner selected', created_at: new Date() }])
    .select()
    .single();

  if (drawError) return res.send('Error creating draw');

  // 4. विजेत्याला winners टेबलमध्ये घाला (प्राइज पूल साठी एकूण 1000 मानू)
  const prizeAmount = 500; // सुरुवातीला fixed prize
  const { error: winnerError } = await supabase
    .from('winners')
    .insert([{
      user_id: winnerUserId,
      draw_id: draw.id,
      amount: prizeAmount,
      status: 'pending'
    }]);

  if (winnerError) return res.send('Error saving winner');
  res.redirect('/admin/dashboard');
};

exports.verifyPayout = async (req, res) => {
  const { winner_id } = req.body;
  const { error } = await supabase
    .from('winners')
    .update({ status: 'paid' })
    .eq('id', winner_id);
  if (error) return res.send('Error updating payout');
  res.redirect('/admin/dashboard');
};