const passport = require('passport')
const wrap = require('nodeifyit')
const User = require('../models/user')
const config = require('../../config/auth')

const LocalStrategy = require('passport-local').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const TwitterStrategy = require('passport-twitter').Strategy

// Handlers
async function localAuthHandler(email, password) {
  const user = await User.promise.findOne({'local.email': email})

  console.log(user)
  if (!user || email !== user.local.email) {
    console.log('Email is not valid')
    return [false, {message: 'Invalid username'}]
  }

  if (!await user.validatePassword(password)) {
    console.log('Password is not correct')
    return [false, {message: 'Invalid password'}]
  }
  console.log('Login success')
  return user
}

async function localConnectHandler(req, email, password) {
  const user = await User.promise.findOne({'local.email': email})
  
  if(user === req.user) {
    console.log('Email is used by another user')
    return [false, {message: 'Email is used by another user'}]
  }
  return await req.user.saveLocal(email, password)
}

async function localSignupHandler(email, password) {
  email = (email || '').toLowerCase()
  // Is the email taken?
  const existUser = await User.promise.findOne({'local.email': email})
  console.log(existUser)
  if (existUser) {
    console.log('Email is exist')
    return [false, {message: 'That email is already taken.'}]
  }

  // create the user
  const user = new User()
  return await user.saveLocal(email, password)
}

// 3rd-party Auth Helper
function loadPassportStrategy(OauthStrategy, config, userField) {
  config.passReqToCallback = true
  passport.use(new OauthStrategy(config, wrap(authCB, {spread: true})))

  async function authCB(req, token, _ignored_, account) {
    console.log(req.path)
    if(req.path === '/auth/facebook/callback') {
      return await facebookCallback(req, token, account)
    } else if(req.path === '/auth/twitter/callback') {
      return await twitterCallback(req, token, _ignored_, account)
    }
  }
}

async function facebookCallback(req, token, account) {
  const user = await User.promise.findOne({'facebook.id': account.id})
  if(user) {
    return user.saveFacebook(account.id, token, '', account.displayName)
  }
  if(!req.user) {
    // Create new user here
    const user = new User()
    return user.saveFacebook(account.id, token, '', account.displayName)
  } else {
    return req.user.saveFacebook(account.id, token, '', account.displayName)
  }
}

async function twitterCallback(req, token, tokenSecret, account) {
  console.log(account)
  const user = await User.promise.findOne({'twitter.id': account.id})
  if(user) {
    return user.saveTwitter(account.id, token, tokenSecret, account.displayName, account.username)
  }
  if(!req.user) {
    // Create new user here
    const user = new User()
    return user.saveTwitter(account.id, token, tokenSecret, account.displayName, account.username)
  } else {
    return req.user.saveTwitter(account.id, token, tokenSecret, account.displayName, account.username)
  }
}

function configure(CONFIG) {
  // Required for session support / persistent login sessions
  passport.serializeUser(wrap(async (user) => user._id))
  passport.deserializeUser(wrap(async (id) => {
    return await User.promise.findById(id)
  }))

  /**
   * Local Auth
   */
  const localLoginStrategy = new LocalStrategy({
    usernameField: 'email', // Use "email" instead of "username"
    failureFlash: true // Enable session-based error logging
  }, wrap(localAuthHandler, {spread: true}))

  const localSignupStrategy = new LocalStrategy({
    usernameField: 'email',
    failureFlash: true
  }, wrap(localSignupHandler, {spread: true}))

  const localConnectStrategy = new LocalStrategy({
    usernameField: 'email', // Use "email" instead of "username"
    failureFlash: true, // Enable session-based error logging
    passReqToCallback: true
  }, wrap(localConnectHandler, {spread: true}))

  passport.use('local-login', localLoginStrategy)
  passport.use('local-signup', localSignupStrategy)
  passport.use('local-connect', localConnectStrategy)

  /**
   * 3rd-Party Auth
   */

  // loadPassportStrategy(LinkedInStrategy, {...}, 'linkedin')
  loadPassportStrategy(FacebookStrategy, {
    clientID: config.facebook.consumerKey,
    clientSecret: config.facebook.consumerSecret,
    callbackURL: config.facebook.callbackUrl 
  }, 'facebook')
  // loadPassportStrategy(GoogleStrategy, {...}, 'google')
  loadPassportStrategy(TwitterStrategy, {
    consumerKey: config.twitter.consumerKey,
    consumerSecret: config.twitter.consumerSecret,
    callbackURL: config.twitter.callbackUrl,
  }, 'twitter')

  return passport
}

module.exports = {passport, configure}
