var http = require('http'),
  request = require('request')
  ;


var refreshInterval = 10; //seconds cycle in checking TweetCollector for events

var APP_VERSION = "0.8.2"
var APP_NAME = "TweetRetriever"

// url for tweet collector on Oracle Container Cloud
var tweet_collector_url = "http://129.144.150.140:8005/tweets";
var tweet_receiver_url = "http://192.168.99.100:31276/tweet";

var latestTweet = "";

console.log("Running " + APP_NAME + " version " + APP_VERSION);


//poll the EventHub every 10 seconds for new events to locally Publish to Kafka
initHeartbeat = function (interval) {
  setInterval(function () {
    checkTweetCollector();
  }
    , interval ? interval * 1000 : refreshInterval
  ); // setInterval 3000 is 3 secs
}//initHeartbeat


initHeartbeat(refreshInterval)

function checkTweetCollector() {
  // make request to tweet collector
  request(tweet_collector_url, function (error, response, body) {
    if (error) {
      console.error("Failed to gather tweets from collector : " + error);
    } else {
      try {
        var tweets = JSON.parse(body).tweets;
        for (i = 0; i < tweets.length; i++) {
          if (tweets[i].text === latestTweet) {
            doneAll = true;
            break;
          }
          // here would go the code to publish tweet to TweetReceiver
          //  postTweetToReceiver(tweets[i]);
          console.log("tweet: " + i + " : " + tweets[i].text);
        }//for
        latestTweet = tweets[0].text;
      } catch (e) {
        console.error("failed to process tweets because of " + e);
      }
    }//else (no error)
  });
}//checkTweetCollector

function postTweetToReceiver(tweet) {
  var options = {
    method: 'POST',
    url: tweet_receiver_url
    ,
    headers:
    {
      'content-type': 'application/json'
    },
    body: tweet,
    json: true
  };

  request(options, function (error, response, body) {
    if (error) {
      console.error("Error in posting tweet to TweetReceiver " + JSON.stringify(error));
    }
    else {
      console.log("Published Tweet to TweetReceiver: " + tweet.text);
    }
  })

}//postTweetToReceiver
