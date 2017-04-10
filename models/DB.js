// DB SETUP
var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost:auth/auth');
mongoose.connect('mongodb://Soen487:Soen487@ds145790.mlab.com:45790/soen487');

// create a league model
var Team = mongoose.model('Team', {
    alias: String,
      lat: String,
      lng: String
});

module.exports = Team;