module.exports = {

  facebook: {
    consumerKey: '101517050325781',
    consumerSecret: '575dda6e48899614b856e70ef418e675',
    callbackUrl: 'http://socialauthenticator.com:8000/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'photos', 'email'],
    enableProof: true
  },

  twitter: {
    consumerKey: 'qN7w91xf0OkbOb80j30Sxw5tb',
    consumerSecret: 'RbcJzr2djKCUmbP6NAcfszlMLFjiFfVDIRNxGhQ4D7IUwS3ivn',
    callbackUrl: 'http://socialauthenticator.com:8000/auth/twitter/callback'
  }
}
