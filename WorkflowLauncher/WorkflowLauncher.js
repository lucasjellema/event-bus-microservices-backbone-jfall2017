var localCacheAPI = require("./local-cache-api.js");
var localLoggerAPI = require("./local-logger-api.js");
var eventBusPublisher = require("./EventPublisher.js");
var eventBusConsumer = require("./EventConsumer.js");

var workflowEventsTopic = "workflowEvents";

// please create Kafka Topic before using this application in the VM running Kafka
// kafka-topics --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic workflowEvents

var APP_VERSION = "0.9.2"
var APP_NAME = "WorkflowLauncher"

var workflowTemplateCacheKey = "oracle-code-tweet-processor-workflow-template";

eventBusConsumer.registerEventHandler(workflowEventsTopic, handleWorkflowEvent);


console.log("Running " + APP_NAME + " version " + APP_VERSION);


// consume local workflowEvents from Kafka and produce RoutingSlip events for new workflow instances triggered by these events
// Routingslip is based on the workflow template retrieved from the cache
function handleWorkflowEvent(eventMessage) {
  var event = JSON.parse(eventMessage.value);
  console.log("received message", eventMessage);
  if ("NewTweetEvent" == eventMessage.key) {
    console.log("A new tweet event has reached us. Time to act and publish a corresponding workflow event");

    localCacheAPI.getFromCache(workflowTemplateCacheKey, function (value) {
    
      localLoggerAPI.log("Retrieved workflowTemplate from cache under key  " + workflowTemplateCacheKey
       +" content:"+ JSON.stringify(value)
      , APP_NAME, "info");

      console.log("Workflow template retrieved from cache under key "+workflowTemplateCacheKey);
      // use either the template retrieved from the cache of the default template if the cache retrieval failed
      var message = (value.workflowType)? value : defaultMessage;
      message.payload = event.tweet;
      message.workflowConversationIdentifier = "OracleCodeTweetProcessor" + new Date().getTime();
      message.audit.push({ "when": new Date().getTime(), "who": "WorkflowLauncher", "what": "creation", "comment": "initial creation of workflow" })
      message.creationTimeStamp = new Date().getTime()
      message.creator = "WorkflowLauncher";
      eventBusPublisher.publishEvent(message.workflowConversationIdentifier, message, workflowEventsTopic);

      localLoggerAPI.log("Initialized new workflow  for tweet " + message.payload.text + " by " + message.payload.author + " - (workflowConversationIdentifier:" + message.workflowConversationIdentifier + ")"
        , APP_NAME, "info");
      localLoggerAPI.log("Initialized new workflow OracleCodeTweetProcessor triggered by NewTweetEvent; stored workflowevent plus routing slip in cache under key " + message.workflowConversationIdentifier + " - (workflowConversationIdentifier:"
        + message.workflowConversationIdentifier + "; slip is based on workflow template "+message.workflowType+" version "+message.workflowVersion+")"
        , APP_NAME, "info");


      // PUT Workflow Event in Cache under workflow event identifier
      localCacheAPI.putInCache(message.workflowConversationIdentifier, message,
        function (result) {
          console.log("store workflowevent plus routing slip in cache under key " + message.workflowConversationIdentifier + ": " + JSON.stringify(result));
        });
      }) //getFromCache
  }//if 

}// handleWorkflowEvent

var defaultMessage =
  {
    "workflowType": "oracle-code-tweet-processor"
    , "workflowVersion": "0.9"
    , "creator": "WorkflowLauncher"
    , "actions":
    [{
      "id": "ValidateTweetAgainstFilters"
      , "type": "ValidateTweet"
      , "status": "new"  // new, inprogress, complete, failed
      , "result": "" // for example OK, 0, 42, true
      , "conditions": [] // a condition can be {"action":"<id of a step in the routingslip>", "status":"complete","result":"OK"}; note: the implicit condition for this step is that its own status = new   
    }
      , {
      "id": "EnrichTweetWithDetails"
      , "type": "EnrichTweet"
      , "status": "new"  // new, inprogress, complete, failed
      , "result": "" // for example OK, 0, 42, true
      , "conditions": [{ "action": "ValidateTweetAgainstFilters", "status": "complete", "result": "OK" }]
    }
      , {
      "id": "CaptureToTweetBoard"
      , "type": "TweetBoardCapture"
      , "status": "new"  // new, inprogress, complete, failed
      , "result": "" // for example OK, 0, 42, true
      , "conditions": [{ "action": "EnrichTweetWithDetails", "status": "complete", "result": "OK" }]
    }
    ]
    , "audit": [
      { "when": new Date().getTime(), "who": "WorkflowLauncher", "what": "creation", "comment": "initial creation of workflow" }
    ]
    , "payload": {
      "text": "Fake 2 #oraclecode Tweet @StringSection"
      , "author": "lucasjellema"
      , "authorImageUrl": "http://pbs.twimg.com/profile_images/427673149144977408/7JoCiz-5_normal.png"
      , "createdTime": "April 17, 2017 at 01:39PM"
      , "tweetURL": "http://twitter.com/SaibotAirport/status/853935915714138112"
      , "firstLinkFromTweet": "https://t.co/cBZNgqKk0U"
    }
  };

