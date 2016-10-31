const isLoggedIn = require('./middlewares/isLoggedIn')
const posts = require('../data/posts')
const Twitter = require('twitter')
const then = require('express-then')

module.exports = (app) => {
  const passport = app.passport
  const twitterConfig = app.config.auth.twitter

  const networks = {
    twitter: {
      icon: 'twitter',
      name: 'Twitter',
      class: 'btn-info'
    }
  }
  app.get('/', (req, res) => {
    res.render('index.ejs', {message: req.flash('error')})
  })

  app.get('/login', function(req, res) {
    // render the page and pass in any flash data if it exists
    res.render('login.ejs', { message: req.flash('loginMessage') });
  })

  app.get('/signup', function(req, res) {
    // render the page and pass in any flash data if it exists
    res.render('signup.ejs', { message: req.flash('signupMessage') });
  })

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }))

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }))

  app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      message: req.flash('error')
    })
  })


  app.get('/connect/local', function(req, res) {
    // render the page and pass in any flash data if it exists
    res.render('connect-local.ejs', { message: req.flash('connectMessage') });
  })

  app.post('/connect/local', passport.authenticate('local-connect', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }))

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  const facebook_scope = ['email', 'public_profile', 'user_status', 'user_posts', 'user_likes']
  // Authentication route & Callback URL

  app.get('/auth/facebook', passport.authenticate('facebook', { scope: facebook_scope}))
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/facebook', passport.authorize('facebook', { scope: facebook_scope}))
  app.get('/connect/facebook/callback', passport.authorize('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  // Twitter
  app.get('/auth/twitter', passport.authenticate('twitter'))
  app.get('/auth/twitter/callback', passport.authenticate('twitter', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))
  // Authorization route & Callback URL
  app.get('/connect/twitter', passport.authorize('twitter'))
  app.get('/connect/facebook/callback', passport.authorize('twitter', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  app.get('/unlink/:type', (req, res) => {
    res.end('No way LOL')      
  })

  app.get('/timeline', isLoggedIn, then(async (req, res) => {
    const twitterClient = createTwitterClient(req) 
    const tweets = (await twitterClient.promise.get('statuses/home_timeline')).map( tweet => {
      return postFromTweet(tweet)
    })
    res.render('timeline.ejs', {
      posts: tweets
    })
  }))

  app.get('/compose', isLoggedIn, (req, res) => {
    res.render('compose.ejs', {
      message: req.flash('error')
    })
  })

  app.post('/compose', isLoggedIn, then( async(req, res) => {
    const twitterClient = createTwitterClient(req) 

    const status = req.body.reply
    if(status.length > 140) {
      return req.flash('error', 'Status is over 140 characters!')
    }
    if(!status) {
      return req.flash('error', 'Status cannot be empty')
    }
    await twitterClient.promise.post('statuses/update', {status})

    res.redirect('/timeline')
  }))

  app.post('/like/:id', isLoggedIn, then(async(req, res) => {
    const id = req.params.id
    const twitterClient = createTwitterClient(req) 
    await twitterClient.promise.post('favorites/create', {id})
    res.end()
  }))

  app.post('/unlike/:id', isLoggedIn, then(async(req, res) => {
    const id = req.params.id
    const twitterClient = createTwitterClient(req) 
    await twitterClient.promise.post('favorites/destroy', {id})
    res.end()
  }))

  app.post('/share/:id/:username', isLoggedIn, then(async(req, res) => {
    const id = req.params.id
    const username = req.params.username
    const twitterClient = createTwitterClient(req) 
    const status = req.body.share

    if(status.length > 140) {
      return req.flash('error', 'Status is over 140 characters!')
    }
    if(status) {
      await twitterClient.promise.post('statuses/update', {status: `${status} ${getTweetUrl(id, username)}`})
    } else {
      await twitterClient.promise.post('statuses/retweet', {id})
    }
    res.redirect('/timeline')
  }))

  app.get('/share/:id', isLoggedIn, then(async(req, res) => {
    const twitterClient = createTwitterClient(req)
    const id = req.params.id
    const tweet = await twitterClient.promise.get('statuses/show', {id})
    res.render('share.ejs', {
      message: req.flash('error'),
      post: postFromTweet(tweet)
    })
  }))

  app.get('/reply/:id', isLoggedIn, then(async(req, res) => {
    const twitterClient = createTwitterClient(req)
    const id = req.params.id
    const tweet = await twitterClient.promise.get('statuses/show', {id})
    res.render('reply.ejs', {
      message: req.flash('error'),
      post: postFromTweet(tweet)
    })
  }))

  app.post('/reply/:id/:username', isLoggedIn, then(async(req, res) => {
    const id = req.params.id
    const username = req.params.username
    console.log(`id: ${id}, username: ${username}`)
    const twitterClient = createTwitterClient(req) 
    const status = req.body.reply
    if(status.length > 140) {
      return req.flash('error', 'Status is over 140 characters!')
    }
    if(!status) {
      return req.flash('error', 'Status cannot be empty')
    }
    await twitterClient.promise.post('statuses/update', {status: `@${username} ${status}`, in_reply_to_status_id: id})
    res.redirect('/timeline')
  }))

  function createTwitterClient(req) {
    return new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.tokenSecret,
    })
  }

  function postFromTweet(tweet) {
      return {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: '@' + tweet.user.screen_name,
        liked: tweet.favorited,
        network: networks.twitter
      }
  }

  function getTweetUrl(id, username) {
    return `https://twitter.com/${username}/status/${id}`
  }

}
