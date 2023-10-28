var router = require('express').Router();
const { requiresAuth } = require('express-openid-connect');
const pgp = require('pg-promise')();
const dotenv = require('dotenv');

dotenv.config();

const db = pgp({connectionString: process.env.DATABASE_URL,
  ssl: {rejectUnauthorized: false}});

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'home',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

router.get('/profile', requiresAuth(), async function (req, res, next) {

  userProfile = JSON.stringify(req.oidc.user, null, 2)
  const userProfileObject = JSON.parse(userProfile);

  const competitions = await db.any('SELECT * FROM competitions WHERE email = $1', [userProfileObject.email]);  

  res.render('profile', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Profile page',
    competitions,
  });
});

router.get('/input', requiresAuth(), function (req, res, next) {
  res.render('input', {
    title: 'Input'
  });
});

router.post('/input', async (req, res) => {
  try {
    console.log('Form Data Received:', req.body);

    const competitionName = req.body.competitionName;
    const participants = req.body.participants.split(';').map(participant => participant.trim());
    const scoringSystem = req.body.scoringSystem.split('/').map(score => parseInt(score.trim()));
  
    // Do something with the competition data, e.g., save it to a database
    userProfile = JSON.stringify(req.oidc.user, null, 2)
    const userProfileObject = JSON.parse(userProfile);
    console.log('Form Data Received:', userProfileObject);
  
    console.log(competitionName, scoringSystem[0], scoringSystem[1], scoringSystem[2], userProfileObject.email);

    const competitionData = await db.one('INSERT INTO competitions (competition_name, win, loss, draw, email) VALUES ($1, $2, $3, $4, $5) RETURNING id', [competitionName, scoringSystem[0], scoringSystem[1], scoringSystem[2], userProfileObject.email]);
    const competition_id = competitionData.id;

    const participants_id = [];
    for (let index = 0; index < participants.length; index++) {
      const participantName = participants[index];
      const participantData = await db.one('INSERT INTO participants (participant_name, competition_id) VALUES ($1, $2) RETURNING id', [participantName, competition_id]);
      participants_id[index] = participantData.id;
    }   
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[0], participants_id[1], competition_id, 1]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[2], participants_id[3], competition_id, 1]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[0], participants_id[2], competition_id, 2]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[1], participants_id[3], competition_id, 2]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[0], participants_id[3], competition_id, 3]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[1], participants_id[2], competition_id, 3]);

    res.redirect('/competition/' + competition_id);
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/competition/:competition_id', async (req, res) => {
  const competition_id = req.params.competition_id;
  let isOwner = false;

  userProfile = JSON.stringify(req.oidc.user, null, 2)

  try {
    const [competition_data, participant_data, scores_data] = await Promise.all([
      db.any('SELECT * FROM competitions WHERE id = $1', [competition_id]),
      db.any('SELECT * FROM participants WHERE competition_id = $1', [competition_id]),
      db.any('SELECT * FROM scores WHERE competition_id = $1', [competition_id])
    ]);

    if (userProfile != undefined) {
      const userProfileObject = JSON.parse(userProfile);
      if (competition_data[0].email == userProfileObject.email) { isOwner = true;}
    }

    res.render('competition', { competition_data, participant_data, scores_data, isOwner });
  } catch (error) {
    console.log('ERROR:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/saveWinners', async (req, res) => {
  const scoreId = req.body.score_id;
  const winners = req.body.winners;
  const competition_id_data = await db.one('UPDATE scores SET participantwin_id = $1 WHERE id = $2 RETURNING competition_id', [winners[0], scoreId]);
  const competition_id = competition_id_data.competition_id;
  const winscore = await db.one('SELECT win FROM competitions WHERE id = $1', [competition_id]);
  const participantscore = await db.one('SELECT score FROM participants WHERE id = $1', [winners[0]]);
  participantscore.score += winscore.win;
  await db.none('UPDATE participants SET score = $1 WHERE id = $2', [participantscore.score, winners[0]])
  res.redirect('/competition/' + competition_id);
});

module.exports = router;
