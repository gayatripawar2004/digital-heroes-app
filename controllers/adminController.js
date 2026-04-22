const supabase = require('../config/db');

exports.dashboard = async (req, res) => {
  try {
    // Total users
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // All draws (recent first)
    const { data: draws } = await supabase
      .from('draws')
      .select('*')
      .order('created_at', { ascending: false });

    // Winners with user and draw details
    const { data: winners } = await supabase
      .from('winners')
      .select(`
        *,
        users (name, email),
        draws (result, numbers, created_at)
      `)
      .order('created_at', { ascending: false });

    // Total prize pool
    const { data: prizeData } = await supabase
      .from('winners')
      .select('amount');
    let totalPrizePool = 0;
    if (prizeData) totalPrizePool = prizeData.reduce((sum, w) => sum + (w.amount || 0), 0);

    // Charity total (approx $1 per active subscription)
    const { count: activeSubs } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    const charityTotal = (activeSubs || 0) * 1;

    const drawsCount = draws ? draws.length : 0;

    res.render('admin/dashboard', {
      userCount: userCount || 0,
      draws: draws || [],
      winners: winners || [],
      totalPrizePool,
      charityTotal,
      drawsCount
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.send('Admin dashboard error: ' + err.message);
  }
};

exports.runDraw = async (req, res) => {
  try {
    // 1. सर्व active subscribers मिळवा
    const today = new Date().toISOString().split('T')[0];
    const { data: activeUsers, error: userError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .gte('expiry_date', today);

    if (userError || !activeUsers || activeUsers.length === 0) {
      return res.send('No active subscribers. Cannot run draw.');
    }

    // 2. 5 यादृच्छिक नंबर तयार करा
    const numbers = [];
    while (numbers.length < 5) {
      const n = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(n)) numbers.push(n);
    }
    const resultText = `Winning numbers: ${numbers.join(', ')}`;

    // 3. ड्रॉ रेकॉर्ड तयार करा
    const { data: draw, error: drawError } = await supabase
      .from('draws')
      .insert({ result: resultText, created_at: new Date() })
      .select()
      .single();

    if (drawError) return res.send('Failed to create draw: ' + drawError.message);

    // 4. ✅ सर्व active यूजरसाठी participation नोंदी तयार करा
    const participationRecords = activeUsers.map(u => ({
      user_id: u.user_id,
      draw_id: draw.id,
      entered_at: new Date()
    }));
    const { error: partError } = await supabase
      .from('user_draw_participation')
      .insert(participationRecords);

    if (partError) console.error('Participation insert warning:', partError);

    // 5. यादृच्छिक विजेता निवडा
    const randomIndex = Math.floor(Math.random() * activeUsers.length);
    const winnerUserId = activeUsers[randomIndex].user_id;

    // 6. winners टेबलमध्ये विजेता घाला
    const { error: winnerError } = await supabase
      .from('winners')
      .insert({
        user_id: winnerUserId,
        draw_id: draw.id,
        amount: 500,
        status: 'pending'
      });

    if (winnerError) return res.send('Failed to save winner: ' + winnerError.message);

    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Run draw error:', err);
    res.send('Unexpected error: ' + err.message);
  }
};
exports.verifyPayout = async (req, res) => {
  try {
    const { winner_id } = req.body;
    if (!winner_id) return res.send('Winner ID missing');

    const { error } = await supabase
      .from('winners')
      .update({ status: 'paid' })
      .eq('id', winner_id);

    if (error) {
      console.error('Payout update error:', error);
      return res.send('Error updating payout: ' + error.message);
    }
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Verify payout error:', err);
    res.send('Error: ' + err.message);
  }
};