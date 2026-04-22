const supabase = require('../config/db');

// ================= DASHBOARD =================
exports.dashboard = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. User details (with charity percentage)
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, charity_id, charity_percentage')
      .eq('id', userId)
      .single();

    // 2. Subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 3. Scores (last 5, most recent first)
    const { data: scores } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5);

    // 4. Charity details
    let charity = null;
    if (user?.charity_id) {
      const { data: c } = await supabase
        .from('charities')
        .select('*')
        .eq('id', Number(user.charity_id))
        .single();
      charity = c;
    }

    // 5. Winnings (from winners table, join with draws for result)
    const { data: winnings } = await supabase
      .from('winners')
      .select(`
        id, amount, status, created_at,
        draws (result, created_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const totalWon = (winnings || []).reduce((sum, w) => sum + (w.amount || 0), 0);

    // 6. Draw history (all draws, most recent first)
    const { data: allDraws } = await supabase
      .from('draws')
      .select('*')
      .order('created_at', { ascending: false });

    // 7. Participation summary (simplified: draws that user has entered)
    // If you have user_draw_participation table, use it. Otherwise, we can
    // just show upcoming draws based on current date.
    const today = new Date().toISOString().split('T')[0];
    const upcomingDraws = (allDraws || []).filter(d => d.created_at >= today);

    // Draw Participation (with join to draws table)
const { data: participation } = await supabase
  .from('user_draw_participation')
  .select(`
    id,
    entered_at,
    draws (id, result, created_at)
  `)
  .eq('user_id', userId)
  .order('entered_at', { ascending: false });

   res.render('user/dashboard', {
  user,
  subscription,
  scores,
  charity,
  totalWon,
  winnings: winnings || [],
  participation: participation || [],   // ✅ फक्त एकदाच
  upcomingDraws,
  allDraws: allDraws || []
});
  } catch (err) {
    console.error('Dashboard error:', err);
    res.send('Dashboard error: ' + err.message);
  }
};

// ================= SUBSCRIBE FORM =================
exports.showSubscribeForm = (req, res) => {
  res.render('user/subscribe');
};

// ================= CREATE / UPDATE SUBSCRIPTION =================
exports.createSubscription = async (req, res) => {
  const { plan } = req.body;
  const userId = req.user.id;

  try {
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
        plan,
        expiry_date: expiryDate.toISOString().split('T')[0],
        updated_at: new Date()
      }, { onConflict: 'user_id' });

    if (error) throw error;
    res.redirect('/user/dashboard');
  } catch (err) {
    res.send('Subscription error: ' + err.message);
  }
};

// ================= UPDATE CHARITY PERCENTAGE =================
exports.updateCharityPercentage = async (req, res) => {
  const { percentage } = req.body;
  const userId = req.user.id;

  try {
    const { error } = await supabase
      .from('users')
      .update({ charity_percentage: Number(percentage) })
      .eq('id', userId);

    if (error) throw error;
    res.redirect('/user/dashboard');
  } catch (err) {
    res.send('Error updating charity: ' + err.message);
  }
};

// ================= EDIT SCORE =================
exports.editScore = async (req, res) => {
  const { id } = req.params;
  const { score, date } = req.body;

  try {
    const { error } = await supabase
      .from('scores')
      .update({ score: Number(score), date })
      .eq('id', id);

    if (error) throw error;
    res.redirect('/user/dashboard');
  } catch (err) {
    res.send('Error updating score: ' + err.message);
  }
};