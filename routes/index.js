var router = require('express').Router();
const { requiresAuth } = require('express-openid-connect');
const db = require('./db');

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'home',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

router.get('/profile', requiresAuth(), function (req, res, next) {
  res.render('profile', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Profile page'
  });
});

router.get('/input', requiresAuth(), function (req, res, next) {
  res.render('input', {
    title: 'Input'
  });
});

router.post('/input', (req, res) => {

  console.log('Form Data Received:', req.body);

  const competitionName = req.body.competitionName;
  const participants = req.body.participants.split(';').map(participant => participant.trim());
  const scoringSystem = req.body.scoringSystem.split('/').map(score => parseInt(score.trim()));
  competition_id, participants_id;

  // Do something with the competition data, e.g., save it to a database
  userProfile = JSON.stringify(req.oidc.user, null, 2)
  console.log('Form Data Received:', userProfile);

  db.one('INSERT INTO competitions (competition_name, win, loss, draw, email) VALUES ($1, $2, $3, $4, $5) RETURNING id', [competitionName, scoringSystem[0], scoringSystem[1], scoringSystem[2], userProfile.email])
    .then(data => {
      competition_id = data.id;
      console.log(data.id);
    })
    .catch(error => {
      console.error('Error inserting data into the competitions database:', error);
    });
  
  for (let index = 0; index < participants.length; index++) {
    const participantName = participants[index];
    db.one('INSERT INTO participants (participant_name, competition_id) VALUES ($1, $2) RETURNING id', [participantName, competition_id])
      .then(data => {
        participants_id[index] = data.id;
        console.log(data.id);
      })
      .catch(error => {
        console.error('Error inserting data into the participants database:', error);
      });
  }

  if (participants.length == 4) {
    db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[0], participants_id[1], competition_id, 1])
      .then(() => {
        console.log('Score added');
      })
      .catch(error => {
        console.error('Error inserting data into the competitions database:', error);
      });
    db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[2], participants_id[3], competition_id, 1])
      .then(() => {
        console.log('Score added');
      })
      .catch(error => {
        console.error('Error inserting data into the competitions database:', error);
      });
    db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[0], participants_id[2], competition_id, 2])
      .then(() => {
        console.log('Score added');
      })
      .catch(error => {
        console.error('Error inserting data into the competitions database:', error);
      });
    db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[1], participants_id[3], competition_id, 2])
      .then(() => {
        console.log('Score added');
      })
      .catch(error => {
        console.error('Error inserting data into the competitions database:', error);
      });
    db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[0], participants_id[3], competition_id, 3])
      .then(() => {
        console.log('Score added');
      })
      .catch(error => {
        console.error('Error inserting data into the competitions database:', error);
      });
    db.none('INSERT INTO scores (participant1_id, participant2_id, competition_id, round) VALUES ($1, $2, $3, $4)', [participants_id[1], participants_id[2], competition_id, 3])
      .then(() => {
        console.log('Score added');
      })
      .catch(error => {
        console.error('Error inserting data into the competitions database:', error);
    });
  }
});

app.get('/competition', (req, res) => {
  const editable = req.query.editable === 'true';
  const competitionName = 'Sample Round Robin Competition';
  const participants = ['Participant 1', 'Participant 2', 'Participant 3', 'Participant 4'];
  const matches = [];
  res.render('competition', { competitionName, participants, matches, editable });
});

app.post('/submit-result', (req, res) => {
  const { match, winner } = req.body;
  console.log(match);
  console.log(winner);
  res.redirect('/');
});

module.exports = router;
