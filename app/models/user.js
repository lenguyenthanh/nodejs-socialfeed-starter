const mongoose = require('mongoose')
const crypto = require('crypto')
const _ = require('lodash')

let userSchema = mongoose.Schema({
  // _id
  local            : {
    email        : String,
    password     : String,
  },
  facebook         : {
    id           : String,
    token        : String,
    email        : String,
    name         : String
  },
  twitter          : {
    id           : String,
    token        : String,
    displayName  : String,
    username     : String,
    tokenSecret  : String,
  },
  google           : {
    id           : String,
    token        : String,
    email        : String,
    name         : String
  },
  linkedin : {
    id : String,
    token : String
  }
})

userSchema.methods.generateHash = async function(password) {
  let hash = await crypto.promise.pbkdf2(password, 'salt', 4096, 512, 'sha256')
  return hash.toString('hex')
}

userSchema.methods.validatePassword = async function(password) {
  let hash = await crypto.promise.pbkdf2(password, 'salt', 4096, 512, 'sha256')
  return hash.toString('hex') === this.local.password
}

userSchema.methods.saveLocal = async function(email, password) {
  this.local.email = email
  // Use a password hash instead of plain-text
  this.local.password = await this.generateHash(password)
  return await this.save()
}

userSchema.methods.saveFacebook = async function(facebookId, token, email, name) {
  this.facebook.id = facebookId
  this.facebook.name = name
  this.facebook.token = token
  this.facebook.email = email
  return await this.save()
}

userSchema.methods.saveTwitter = async function(twitterId, token, tokenSecret, displayName, name) {
  this.twitter.id = twitterId
  this.twitter.displayName = displayName
  this.twitter.token = token
  this.twitter.username = name
  this.twitter.tokenSecret = tokenSecret
  return await this.save()
}


module.exports = mongoose.model('User', userSchema)
