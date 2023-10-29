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
      const participantData = await db.one('INSERT INTO participants (participant_name, competition_id, score) VALUES ($1, $2, $3) RETURNING id', [participantName, competition_id, 0]);
      participants_id[index] = participantData.id;
    }   
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round, draw, is_finished) VALUES ($1, $2, $3, $4, $5, $6)', [participants_id[0], participants_id[1], competition_id, 1, false, false]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round, draw, is_finished) VALUES ($1, $2, $3, $4, $5, $6)', [participants_id[2], participants_id[3], competition_id, 1, false, false]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round, draw, is_finished) VALUES ($1, $2, $3, $4, $5, $6)', [participants_id[0], participants_id[2], competition_id, 2, false, false]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round, draw, is_finished) VALUES ($1, $2, $3, $4, $5, $6)', [participants_id[1], participants_id[3], competition_id, 2, false, false]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round, draw, is_finished) VALUES ($1, $2, $3, $4, $5, $6)', [participants_id[0], participants_id[3], competition_id, 3, false, false]);
    await db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round, draw, is_finished) VALUES ($1, $2, $3, $4, $5, $6)', [participants_id[1], participants_id[2], competition_id, 3, false, false]);

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

    console.log(scores_data);

    participant_data.sort(function(a, b) {
      return b.score - a.score;
    });

    participant_data.forEach(function(participant, index) {
      participant.rank = index + 1;
    });

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

router.post('/saveResult', async (req, res) => {
  const scoreId = req.body.score_id;
  const result = req.body.result;
  let competition_id_data;
  await db.none('UPDATE scores SET is_finished = $1 WHERE id = $2', [true, scoreId]);
  if (result == -1)
  {
    competition_id_data = await db.one('UPDATE scores SET draw = $1 WHERE id = $2 RETURNING competition_id', [true, scoreId]);
    const competition_id = competition_id_data.competition_id;
    const score = await db.one('SELECT draw FROM competitions WHERE id = $1', [competition_id]);
    console.log('Draw add score =' + score);
    const participants_data = await db.any('SELECT participant1_id, participant2_id FROM scores WHERE id = $1', [scoreId]);
    const participants = participants_data[0];

    const participantscore1 = await db.one('SELECT score FROM participants WHERE id = $1', [participants.participant1_id]);
    console.log('participantscore1 before = ' + participantscore1);
    participantscore1.score += score.draw;
    console.log('participantscore1 after = ' + participantscore1);
    await db.none('UPDATE participants SET score = $1 WHERE id = $2', [participantscore1.score, participants.participant1_id])

    const participantscore2 = await db.one('SELECT score FROM participants WHERE id = $1', [participants.participant2_id]);
    console.log('participantscore2 before = ' + participantscore2);
    participantscore2.score += score.draw;
    console.log('participantscore2 after = ' + participantscore1);
    await db.none('UPDATE participants SET score = $1 WHERE id = $2', [participantscore2.score, participants.participant2_id])
  }
  else
  {
    competition_id_data = await db.one('UPDATE scores SET participantwin_id = $1 WHERE id = $2 RETURNING *', [result, scoreId]);
    console.log('competition_id_data = ' + competition_id_data);
    const competition_id = competition_id_data.competition_id;
    const winscore = await db.one('SELECT win FROM competitions WHERE id = $1', [competition_id]);
    const participantscore = await db.one('SELECT score FROM participants WHERE id = $1', [result]);
    participantscore.score += winscore.win;
    await db.none('UPDATE participants SET score = $1 WHERE id = $2', [participantscore.score, result])
  }
  let competition_id = competition_id_data.competition_id;
  res.redirect('/competition/' + competition_id);
});

module.exports = router;
