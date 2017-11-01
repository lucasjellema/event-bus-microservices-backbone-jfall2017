var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser');
var localCacheAPI = require("./local-cache-api.js");
var localLoggerAPI = require("./local-logger-api.js");

var PORT = process.env.APP_PORT || 8097;
var APP_VERSION = "0.8.2"
var APP_NAME = "CacheInspector"


console.log("Running " + APP_NAME + "version " + APP_VERSION);
setTimeout(() => {
  localLoggerAPI.log(`Initialized and running: ${APP_NAME} - version ${APP_VERSION}`
    , APP_NAME, "info")
}, 3500);


var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log('Microservice' + APP_NAME + ' running, Express is listening... at ' + PORT + " for /ping, /about and /cacheEntry API calls");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About TweetBoard API, Version " + APP_VERSION);
  res.write("Supported URLs:");
  res.write("/ping (GET)\n;");
  res.write("/cacheEntry?key=cacheKey (GET)");
  res.write("/cacheEntry (POST)");
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

app.get('/cacheEntry', function (req, res) {
  var key = req.query.key;
  if (!key || key == null) {
    document = { "result": "parameter key not found in request; request should contain query parameter called key" }
    // Send the response
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  } else {

    console.log('CacheInspector - get document with ' + key + ' from cache');
    localCacheAPI.getFromCache(key, function (document) {
      console.log("tweetboard document retrieved from cache");
      // Send the response
      res.setHeader('Content-Type', 'application/json');
      res.send(document);
    });
  }
});


app.post('/cacheEntry', function (req, res) {
 // Get the key and value
 console.log('CacheInspector - put cache entry');
 console.log('body in request' + JSON.stringify(req.body));
 console.log("content type " + req.headers['content-type']);
 var key = req.body.key;
 var document = req.body.document;
 localCacheAPI.putInCache(key, document,
  function (result) {
    console.log("Written to cache under key "+key);
    var responseBody = { "writtenToCacheUnderKey": key };
    res.setHeader('Content-Type', 'application/json');
    res.send(responseBody);   
  });
}); //post
