var Twit = require('twit');
const express = require('express');
const app = express();
const http = require("http");

const { twitterconfig } = require('./twitterconfig');

const bodyParser = require('body-parser');

var tweetReceiverServiceHost = "192.168.99.100";
var tweetReceiverServicePort = "32198";


app.use(bodyParser.json());

var T = new Twit({
  consumer_key: twitterconfig.consumer_key,
  consumer_secret: twitterconfig.consumer_secret,
  access_token: twitterconfig.access_token_key,
  access_token_secret: twitterconfig.access_token_secret,
  timeout_ms: 60 * 1000,
});


var hashtags = { track: ['jfall', 'jfall17', 'nljug'] };
let tweetStream = T.stream('statuses/filter', hashtags)
tweetstream(hashtags, tweetStream);

function tweetstream(hashtags, tweetStream) {
  //  tweetStream.stop();
  // tweetStream = T.stream('statuses/filter', { track:   hashtags });
  console.log("Started tweet stream for hashtag #" + JSON.stringify(hashtags));

  tweetStream.on('connected', function (response) {
    console.log("Stream connected to twitter for #" + JSON.stringify(hashtags));
  })
  tweetStream.on('error', function (error) {
    console.log("Error in Stream for #" + JSON.stringify(hashtags) + " " + error);
  })
  tweetStream.on('tweet', function (tweet) {
    produceTweetEvent(tweet);
  });
}

function produceTweetEvent(tweet) {
  var options = {
    "method": "POST",
    "hostname": tweetReceiverServiceHost,
    "port": tweetReceiverServicePort,
    "path": "/tweet",
    "headers": {
      "content-type": "application/json",
    }
  };

  var req = http.request(options, function (res) {
    var chunks = [];

    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      var body = Buffer.concat(chunks);
      console.log(body.toString());
    });
  });

  req.write(JSON.stringify({
    text: tweet.text,
    author: tweet.user.name,
    authorImageUrl: 'http://pbs.twimg.com/profile_images/427673149144977408/7JoCiz-5_normal.png',
    //    createdTime: 'November 1st, 2017 at 1:18PM',
    isARetweet: tweet.retweeted_status ? "y" : "n"
    , createdTime: tweet.created_at
    , language: tweet.lang
    , tweetId: tweet.id
  }));
  req.end();
}