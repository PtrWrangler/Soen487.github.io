var express = require('express');
var request = require('request');
var app = express();
const Team = require('./models/DB.js');

var date = new Date();

var sports_url = "http://api.sportradar.us/mlb-t6/games/2017/04/" + date.getDate() + "/boxscore.json?api_key=dcssbmbn4wmdzpjqjeqh8r9d";

//address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&
var sportGeoURL = "https://maps.googleapis.com/maps/api/geocode/json?";
var sportGeoKey = "&key=AIzaSyDgtptR115uvLB8Z6sfk6VT-8IqvoKd0WU";

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
   res.render('index.html');
})

app.get('/sports', function (req, res) {

  var sports_call = request(sports_url, function (error, response, body) {

  console.log('sportradar error:', error); // Print the error if one occurred 
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
  console.log('body:', body); // Print the HTML for the Google homepage. 

  var sports = JSON.parse(body)
  console.log(sports.league.games[0].game.home.abbr)

  var games_list = new Object();
  games_list.games = [];
  var waiting = Object.keys(sports.league.games).length;
  console.log('waiting for: ' + waiting)

  //For each team try to find geolocation in DB, if not request it from google
  checkStillWaiting(res, --waiting, sports.league, games_list)
});

function checkStillWaiting(res, game_idx, sports, games_list) {
  if (game_idx >= 0) {
    Team.findOne({ alias: sports.games[game_idx].game.home.abbr }, function(err, team) {
       console.log('in findOne: ' + sports.games[game_idx].game.home.abbr)
        console.log(team);
      if(err) {
        console.log(err);  // handle errors!
        checkStillWaiting(res, --game_idx, sports, games_list);
      }
      if (!err && team !== null) {

        console.log('Successfully found home team in DB: ' + team)
        games_list.games.push(createGame(sports, team, game_idx))
        checkStillWaiting(res, --game_idx, sports, games_list);

      } else {
        console.log('Home team GeoLoc not in DB, requesting from google for: ' + team)
        //team location does not exist in db yet, request geolocation and save in DB.
        var URIencode_addr = encodeURIComponent(sports.games[game_idx].game.venue.address + ', ' + sports.games[game_idx].game.venue.city + ', ' + sports.games[game_idx].game.venue.country);

        var sportGeoLocRequest = request(sportGeoURL + 'address=' + URIencode_addr + sportGeoKey, function (sportError, sportGeoResponse, sportGeoBody) {
          console.log('Geolocation call error: ' + sportError)
          console.log(sportGeoResponse.statusCode)
          
          if (sportGeoResponse.statusCode == '200') {
            var sportGeoJsonBody = JSON.parse(sportGeoBody)
            console.log('test ' + sports.games[game_idx].game.home.abbr + ' GeoLocation request: ' 
              + JSON.stringify(sportGeoJsonBody.results[0].geometry.location))

            team = new Team({
              alias: sports.games[game_idx].game.home.abbr,
              lat: sportGeoJsonBody.results[0].geometry.location.lat,
              lng: sportGeoJsonBody.results[0].geometry.location.lng
            });
            
            games_list.games.push(createGame(sports, team, game_idx))
            checkStillWaiting(res, --game_idx, sports, games_list);
          }

          team.save(function(err) {
            if(err) {
              console.log(err);  // handle errors!
            } else {
              console.log("saving team ..." + team);
              //done(null, profile);
            }
          });

        });

        
      }
    });
  }
  //You have queried from DB or url reqested all game geoloactions, respond to AJAX
  else {
    var jsonString= JSON.stringify(games_list);
    console.log('testmystring: ' + jsonString)
    res.setHeader('Content-Type', 'application/json');
    res.end(jsonString)

  }
}
   
  //  res.json({msg: s})
})

function createGame(sports, team, game_idx) {
  //prepare json response object
  var game = new Object();

  var UTCTime      = new Date(sports.games[game_idx].game.scheduled); 
  var minutes      = (UTCTime.getMinutes()<10?'0':'') + UTCTime.getMinutes()
  var estTime      = UTCTime.getHours() + ":" + minutes;

  game.home        = sports.games[game_idx].game.home.name;
  game.home_market = sports.games[game_idx].game.home.market;
  game.home_score  = sports.games[game_idx].game.home.runs;
  game.away        = sports.games[game_idx].game.away.name;
  game.away_market = sports.games[game_idx].game.away.market;
  game.away_score  = sports.games[game_idx].game.away.runs;
  game.home_alias  = sports.games[game_idx].game.home.abbr;
  game.away_alias  = sports.games[game_idx].game.away.abbr;
  game.time        = sports.games[game_idx].game.scheduled; 
  game.time        = estTime;
  game.lat         = team.lat; 
  game.lng         = team.lng; 
  console.log(game)
  return game
}

var server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})
