const supabase = require('../config/db');

// फक्त 5 स्कोअर मिळवा (reverse chronological)
exports.getScores = async (userId) => {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(5);
  if (error) return [];
  return data;
};

exports.addScore = async (req, res) => {
  const { score, date } = req.body;
  const userId = req.user.id;

  // 1. डुप्लिकेट तारीख तपासा
  const { data: existing, error: dupError } = await supabase
    .from('scores')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    return res.send('❌ You already entered a score for this date. Edit or delete it first.');
  }

  // 2. सर्व स्कोअर (जुन्यापासून नवीन) मिळवा
  let { data: scores, error: fetchError } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true }); // सर्वात जुना पहिला

  if (fetchError) return res.send('Error fetching scores');

  // 3. जर ५ पेक्षा जास्त असतील तर सर्वात जुना हटवा
  if (scores && scores.length >= 5) {
    const oldest = scores[0];
    await supabase.from('scores').delete().eq('id', oldest.id);
  }

  // 4. नवीन स्कोअर घाला
  const { error: insertError } = await supabase
    .from('scores')
    .insert([{ user_id: userId, score: parseInt(score), date }]);

  if (insertError) return res.send('Error adding score: ' + insertError.message);
  res.redirect('/user/dashboard');
};

exports.deleteScore = async (req, res) => {
  const { id } = req.params;
  await supabase.from('scores').delete().eq('id', id);
  res.redirect('/user/dashboard');
};