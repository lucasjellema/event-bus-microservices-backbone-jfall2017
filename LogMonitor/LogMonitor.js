var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser');
var eventBusConsumer = require("./EventConsumer.js");

var logTopic = "logTopic";
var PORT = process.env.APP_PORT || 8115;
var APP_VERSION = "0.25"
var APP_NAME = "LogMonitor"

console.log("Running " + APP_NAME + " version " + APP_VERSION);


var app = express();
var server = http.createServer(app);

var maxLogs = 100;
// this variable holds an array of up to maxLogs most recent log entries
var logs = [];
server.listen(PORT, function () {
  console.log('Microservice ' + APP_NAME + 'running, Express is listening... at ' + PORT + " for /ping, /about and /logs API calls");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About TweetEnricher API, Version " + APP_VERSION);
  res.write("Supported URLs:");
  res.write("/ping (GET)\n;");
  res.write("/logs (GET)");
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

app.get('/logs', function (req, res) {
  var responseBody = { "logs": logs };
  // Send the response
  res.setHeader('Content-Type', 'application/json');
  res.send(responseBody);

});


// configure Kafka interaction
eventBusConsumer.registerEventHandler(logTopic, handleLogEvent);


function handleLogEvent(eventMessage) {
  var logEntry = JSON.parse(JSON.parse(eventMessage.value));
  console.log("received logEntry", logEntry);
  logs.reverse();
  logs.push(logEntry);
  // most recent ones at the top
  logs.reverse();
  // retain no more than maxLogs entries
  logs = logs.slice(0, maxLogs);
}// handleLogEvent


