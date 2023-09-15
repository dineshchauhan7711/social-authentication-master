const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const express = require('express');
const googleAuth = require('../dal/google-auth.dal');
const router = express.Router();
require('dotenv').config();

let userProfile;
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      userProfile = profile;
      return done(null, userProfile);
    }
  )
);

// request at /auth/google, when user click sign-up with google button transferring
// the request to google server, to show emails screen
router.get(
  '/',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// URL Must be same as 'Authorized redirect URIs' field of OAuth client, i.e: /auth/google/callback
router.get(
  '/callback',
  passport.authenticate('google', { failureRedirect: '/auth/google/error' }),
  (req, res) => {
    res.redirect('/auth/google/success'); // Successful authentication, redirect success.
  }
);

router.get('/success', async (req, res) => {
  const { failure, success } = await googleAuth.registerWithGoogle(userProfile);
  if (failure) console.log('Google user already exist in DB..');
  else console.log('Registering new Google user..');
  res.render('success', { user: userProfile });
});

router.get('/error', (req, res) => res.send('Error logging in via Google..'));

router.get('/signout', (req, res) => {
  try {
    req.session.destroy(function (err) {
      console.log('session destroyed.');
    });
    res.render('auth');
  } catch (err) {
    res.status(400).send({ message: 'Failed to sign out user' });
  }
});


exports.googlesignin = async (req, res) => {
  let validation = new validator(req.body, {
      idToken: "required|string"
  });
  if (validation.fails()) {
      firstMessage = Object.keys(validation.errors.all())[0];
      return RESPONSE.error(res, 412, validation.errors.first(firstMessage));
  }
  else {
      let idAPI = `https://oauth2.googleapis.com/tokeninfo?id_token=${req.body.idToken}`
      await axios.get(idAPI).then(async (result) => {
          const id_token = result.data
          if (id_token) {
              const user = await userModel.findOne({ email: id_token.email })
              if (user) {
                  await user.generateauthtoken();
                  const data = await userModel.findOne({ email: id_token.email });
                  return RESPONSE.success(res, 200, "LOGIN SUCCESSFULLY", data);
              }
              else {
                  const createPattern = {
                      email: id_token.email,
                      first_name: id_token.given_name,
                      last_name: id_token.family_name,
                      image: id_token.picture,
                      role: 1
                  }
                  const userData = new userModel(createPattern);
                  const saveData = await userData.save();
                  const token = await saveData.generateauthtoken();
                  const user = await userModel.findOne({ _id: saveData._id });
                  const finalResponse = {
                      "_id": user._id,
                      "first_name": user.first_name,
                      "last_name": user.last_name,
                      "country": user.country,
                      "email": user.email,
                      "password": user.password,
                      "role": user.role,
                      "is_Active": user.is_Active,
                      "createdAt": user.createdAt,
                      "updatedAt": user.updatedAt,
                      "token":token
                  }
                  const notificationSetting = new notificationSettingModel({
                      user_id:user._id
                  })
                  const notification = await notificationSetting.findOne({ user_id:user._id });
                  if(!notification){
                      await notificationSetting.save();
                      return RESPONSE.success(res, 200, "Login successfully", finalResponse);
                  }else{
                      return RESPONSE.success(res, 200, "Login successfully", finalResponse);
                  }
              }
          }
          else {
              return RESPONSE.error(res, 401, "You are unauthorized")
          }
      }).catch((err) => {
          console.log("error", err);
          return RESPONSE.error(res, 500);
      })
  }
}


module.exports = router;
