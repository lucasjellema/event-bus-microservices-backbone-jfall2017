var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser');

var PORT = process.env.APP_PORT || 8125;
var APP_VERSION = "0.1.3"
var APP_NAME = "TweetCollector"

var moduleName = "TweetCollector";

console.log("Running " + APP_NAME + "version " + APP_VERSION);

var maxTweets = 100;
var tweets = []; // collection of maxTweets most recent tweets

var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log('Microservice ' + APP_NAME + ' running, Express is listening... at ' + PORT + " for /ping, /about, /tweet (POST), /tweets (GET) calls");
});

app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json({ type: '*/*' }));
// perhaps use bodyParser.text() instead of .json
// then parse the content after replacing /n and /n characters
app.use(bodyParser.text({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About " + APP_NAME + ", Version " + APP_VERSION);
  res.write("Supported URLs:");
  res.write("/ping (GET)\n;");
  res.write("/about (GET)\n;");
  res.write("/tweet (POST)");
  res.write("/tweets (GET)");
  res.write("NodeJS runtime version " + process.version);
  res.write("incoming headers" + JSON.stringify(req.headers));
  res.end();
});

app.get('/ping', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("Reply from " + APP_NAME);
  res.write("incoming headers" + JSON.stringify(req.headers));
  res.end();
});

/* Tweet:
 { "text":"Fake 2 #oraclecode Tweet @StringSection" 
             , "author" : "lucasjellema"
             , "authorImageUrl" : "http://pbs.twimg.com/profile_images/427673149144977408/7JoCiz-5_normal.png"
             , "createdTime" : "April 17, 2017 at 01:39PM"
             , "tweetURL" : "http://twitter.com/SaibotAirport/status/853935915714138112"
             , "firstLinkFromTweet" : "https://t.co/cBZNgqKk0U"
             }
*/

app.post('/tweet', function (req, res) {
  console.log('Tweet Receiver TWEET POST');
    // now process text in req.body
  var tweetText = req.body;
  // correct json errors (remove \n and \r characters (ascii 13 and 10))
  tweetText = tweetText.replace(/\n/g,"");
  tweetText = tweetText.replace(/\r/g,"");
  // then create parse JSON into variable
  var tweet = JSON.parse(tweetText);
  postNewTweet(req, res, req.body);
  res.end();
});//post messages

app.get('/tweets', function (req, res) {
  var responseBody = { "tweets": tweets };
  // Send the response
  res.setHeader('Content-Type', 'application/json');
  res.send(responseBody);
});//get tweets


function postNewTweet(req, res, tweet) {

  console.log("received tweet "+ JSON.stringify(tweet));
  tweets.reverse();
  tweets.push(tweet);
  // most recent ones at the top
  tweets.reverse();
  // retain no more than maxLogs entries
  tweest = tweets.slice(0, maxTweets);
}// postNewTweet