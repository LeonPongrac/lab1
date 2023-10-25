var router = require('express').Router();
const { requiresAuth } = require('express-openid-connect');

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

  // Do something with the competition data, e.g., save it to a database
  userProfile = JSON.stringify(req.oidc.user, null, 2)
  console.log('Form Data Received:', userProfile);
});

module.exports = router;
