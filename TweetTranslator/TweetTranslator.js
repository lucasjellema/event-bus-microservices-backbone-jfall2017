var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser')
translateGoogle = require('google-translate-api');
;

var localCacheAPI = require("./local-cache-api.js");
var localLoggerAPI = require("./local-logger-api.js");
var eventBusPublisher = require("./EventPublisher.js");
var eventBusConsumer = require("./EventConsumer.js");

var workflowEventsTopic = "workflowEvents";
var PORT = process.env.APP_PORT || 8099;
var APP_VERSION = "0.1.1"
var APP_NAME = "TweetTranslator"

var TweetTranslatorActionType = "TranslateTweet";

console.log("Running " + APP_NAME + " version " + APP_VERSION);

var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log('Microservice ' + APP_NAME + 'running, Express is listening... at ' + PORT + " for /ping, /about and /tweet translation API calls");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About TweetTranslator API, Version " + APP_VERSION);
  res.write("Supported URLs:");
  res.write("/ping (GET)\n;");
  res.write("/tweet (POST)");
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

app.post('/tweet', function (req, res) {
  return new Promise(function (resolve, reject) {
    // Get the key and value

    console.log('TweetTranslator - translate tweet');
    console.log('body in request' + JSON.stringify(req.body));
    console.log("content type " + req.headers['content-type']);
    var tweet = req.body;
    translate(tweet).then((translatedTweet) => {
      var responseBody = { "translatedTweet": translatedTweet };
      // Send the response
      res.setHeader('Content-Type', 'application/json');
      res.send(responseBody);
    })
    resolve();
  })// Promise
});

function translate(translatingTweet) {

  return new Promise((resolve, reject) => {
    translatingTweet.translations = [];
    Promise.all([
      translateGoogle(translatingTweet.text, { to: 'de' })
      , translateGoogle(translatingTweet.text, { to: 'es' })
      , translateGoogle(translatingTweet.text, { to: 'fr' })
      , translateGoogle(translatingTweet.text, { from: "en", to: 'nl' })
    ]).then((translations) => {
      localLoggerAPI.log("translate  - all translations are in :" + JSON.stringify(translations)+ ")"
      , APP_NAME, "info");
        
      translations.forEach((val) => { translatingTweet.translations.push(val.text); 
        localLoggerAPI.log("translate - push translated text :" + val.text + ")"
        , APP_NAME, "info");
     });
     localLoggerAPI.log("translate - resolve :)"
     , APP_NAME, "info");
 
      resolve(translatingTweet);
    }) //then
  })//promise
}//translate

// configure Kafka interaction
eventBusConsumer.registerEventHandler(workflowEventsTopic, handleWorkflowEvent);


function handleWorkflowEvent(eventMessage) {
  var event = JSON.parse(eventMessage.value);
  console.log("received message", eventMessage);
  console.log("actual event: " + JSON.stringify(event));
  localLoggerAPI.log("handleWorkflowEvent :" + event.workflowConversationIdentifier + ")"
    , APP_NAME, "info");

  // event we expect is of type workflowEvents
  // we should do something with this event if it contains an action (actions[].type=TweetTranslatorActionType where status ="new" and conditions are satisfied)
  try {
    if (event.actions) {
      var acted = false;
      for (i = 0; i < event.actions.length; i++) {
        var action = event.actions[i];
        // find action of type TranslateTweet
        if (TweetTranslatorActionType == action.type) {
          localLoggerAPI.log("handleWorkflowEvent : action type was found " + action.type
            , APP_NAME, "info");
          // check conditions
          if ("new" == action.status
            && conditionsSatisfied(action, event.actions)) {
            localLoggerAPI.log("handleWorkflowEvent : conditions Satisfied "
              , APP_NAME, "info");
            var workflowDocument;
            // localCacheAPI.getFromCache(event.workflowConversationIdentifier, function (document) {
            //   localLoggerAPI.log("handleWorkflowEvent : workflow slip from cache " + JSON.stringify(document)
            //     , APP_NAME, "info");
            //   console.log("Workflow document retrieved from cache");
            //   var workflowDocument = document;
            //   // this happens  asynchronously; right now we do not actually use the retrieved document. It does work.       
            // });
            // if satisfied, then translate tweet
            localLoggerAPI.log("handleWorkflowEvent : go enter translate promise "
            , APP_NAME, "info");

            translate(event.payload).then((translatedTweet) => {
              localLoggerAPI.log("handleWorkflowEvent : then translated " + JSON.stringify(translatedTweet)
              , APP_NAME, "info");
  
              event.payload = translatedTweet;
              // update action in event
              action.status = 'complete';
              action.result = 'OK';
              // add audit line
              localLoggerAPI.log("handleWorkflowEvent : push to audit"
              , APP_NAME, "info");
  
              event.audit.push(
                { "when": new Date().getTime(), "who": "TweetTranslator", "what": "update", "comment": "Tweet Translation Performed" }
              );
              acted = true;
              if (acted) {
                event.updateTimeStamp = new Date().getTime();
                event.lastUpdater = APP_NAME;
                // publish event
                eventBusPublisher.publishEvent('OracleCodeTwitterWorkflow' + event.updateTimeStamp, event, workflowEventsTopic);

                localLoggerAPI.log("Translated Tweet  - (workflowConversationIdentifier:" + event.workflowConversationIdentifier + ")"
                  , APP_NAME, "info");

                // PUT Workflow Document back  in Cache under workflow event identifier
                // localCacheAPI.putInCache(event.workflowConversationIdentifier, event,
                //   function (result) {
                //     console.log("store workflowevent plus routing slip in cache under key " + event.workflowConversationIdentifier + ": " + JSON.stringify(result));
                //   });
              }// acted
            })// then
          }
        }// if TranslateTweet
        // if any action performed, then republish workflow event and store routingslip in cache
      }//for
    }// if actions
  } catch (err) {
    localLoggerAPI.log("handleWorkflowEvent : EXCEPTION " + err
      , APP_NAME, "info");

  }
}// handleWorkflowEvent

function conditionsSatisfied(action, actions) {
  var satisfied = true;
  // verify if conditions in action are methodName(params) {
  //   example action: {
  //   "id": "CaptureToTweetBoard"
  // , "type": "TweetBoardCapture"
  // , "status": "new"  // new, inprogress, complete, failed
  // , "result": "" // for example OK, 0, 42, true
  // , "conditions": [{ "action": "EnrichTweetWithDetails", "status": "complete", "result": "OK" }]
  for (i = 0; i < action.conditions.length; i++) {
    var condition = action.conditions[i];
    if (!actionWithIdHasStatusAndResult(actions, condition.action, condition.status, condition.result)) {
      satisfied = false;
      break;
    }
  }//for
  return satisfied;
}//conditionsSatisfied

function actionWithIdHasStatusAndResult(actions, id, status, result) {
  for (i = 0; i < actions.length; i++) {
    if (actions[i].id == id && actions[i].status == status && actions[i].result == result)
      return true;
  }//for
  return false;
}//actionWithIdHasStatusAndResult

setTimeout( () => {localLoggerAPI.log("Running " + APP_NAME + " version " + APP_VERSION, APP_NAME, "info")},2500);
