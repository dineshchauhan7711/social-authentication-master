const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const express = require('express');
const User = require('../dal/models/user.model');

const router = express.Router();
require('dotenv').config();

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_SECRET_KEY,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    },
    async function (accessToken, refreshToken, profile, cb) {
      const user = await User.findOne({
        accountId: profile.id,
        provider: 'facebook',
      });
      if (!user) {
        console.log('Adding new facebook user to DB..');
        const user = new User({
          accountId: profile.id,
          name: profile.displayName,
          provider: profile.provider,
        });
        await user.save();
        // console.log(user);
        return cb(null, profile);
      } else {
        console.log('Facebook User already exist in DB..');
        // console.log(profile);
        return cb(null, profile);
      }
    }
  )
);

router.get('/', passport.authenticate('facebook', { scope: 'email' }));

router.get(
  '/callback',
  passport.authenticate('facebook', {
    failureRedirect: '/auth/facebook/error',
  }),
  function (req, res) {
    // Successful authentication, redirect to success screen.
    res.redirect('/auth/facebook/success');
  }
);

router.get('/success', async (req, res) => {
  const userInfo = {
    id: req.session.passport.user.id,
    displayName: req.session.passport.user.displayName,
    provider: req.session.passport.user.provider,
  };
  res.render('fb-github-success', { user: userInfo });
});

router.get('/error', (req, res) => res.send('Error logging in via Facebook..'));

router.get('/signout', (req, res) => {
  try {
    req.session.destroy(function (err) {
      console.log('session destroyed.');
    });
    res.render('auth');
  } catch (err) {
    res.status(400).send({ message: 'Failed to sign out fb user' });
  }
});


exports.facebooksignin = async (req, res) => {
  let accessAPI = `https://graph.facebook.com/me?fields=first_name,last_name,picture,email&access_token=${req.body.accessToken}`;
  await axios.get(accessAPI).then(async (result) => {
      const data = result.data;
      const user = await userModel.findOne({ email: data.email })
      if (user) {
          await user.generateauthtoken();
          const data = await userModel.findOne({ email: user.email });
          return RESPONSE.success(res, 200, "LOGIN SUCCESSFULLY", data);
      }
      else {
          const createPattern = {
              email: data.email,
              first_name: data.given_name,
              last_name: data.family_name,
              image: data.picture,
              role: 1
          }
          const userData = new userModel(createPattern);
          const saveData = await userData.save();
          const token = await saveData.generateauthtoken();
          const Data = await userModel.findOne({ email: saveData.email });
          const finalResponse = {
              "_id": Data._id,
              "first_name": Data.first_name,
              "last_name": Data.last_name,
              "country": Data.country,
              "email": Data.email,
              "password": Data.password,
              "role": Data.role,
              "is_Active": Data.is_Active,
              "createdAt": Data.createdAt,
              "updatedAt": Data.updatedAt,
              "token":token
          }
          return RESPONSE.success(res, 200, "Login successfully", finalResponse);
      }
  }).catch((error) => {
      console.log("error::", error);
      return RESPONSE.error(res, 500)
  })
}

module.exports = router;
