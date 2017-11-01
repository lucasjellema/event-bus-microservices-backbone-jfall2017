var kafka = require('kafka-node');

var kafkaHost = process.env.KAFKA_HOST || "192.168.188.102";
var zookeeperPort = process.env.ZOOKEEPER_PORT || 2181;
var Producer = kafka.Producer
KeyedMessage = kafka.KeyedMessage;
var Consumer = kafka.Consumer
var consumer;

var client;

var APP_VERSION = "0.1.3"
var APP_NAME = "EventBusConsumer"

var consumerOptions = {
  host: kafkaHost + ':' + zookeeperPort,
  groupId: 'consume-newtweets-for-workflowlauncher',
  sessionTimeout: 15000,
  protocol: ['roundrobin'],
  fromOffset: 'earliest' // equivalent of auto.offset.reset valid values are 'none', 'latest', 'earliest'
};



console.log("Initialized module " + APP_NAME + "version " + APP_VERSION);

// no longer called = replace with code in registerEventHandler
function initializeKafkaConsumer(attempt) {
  try {
    console.log("Try to initialize Kafka Client and Consumer, attempt " + attempt);
    var client = new kafka.Client(kafkaHost + ":" + zookeeperPort + "/")
    console.log("created client for " + kafkaHost);
    consumer = new Consumer(
      client,
      [],
      { fromOffset: true }
    );
    console.log("Kafka Client and Consumer initialized " + consumer);
    // register the handler for any messages received by the consumer on any topic it is listening to. 
  }
  catch (err) {
    console.log("Exception in initializeKafkaConsumer" + e);
    console.log("Exception in initializeKafkaConsumer" + JSON.stringify(e));
    console.log("Try again in 5 seconds");
    setTimeout(initializeKafkaConsumer, 5000, attempt + 1);
  }
}//initializeKafkaConsumer

//  initializeKafkaConsumer(1);


var eventConsumer = module.exports;
var consumerGroup;

eventConsumer.registerEventHandler = function (topic, handler) {
  var topics = [topic];
  consumerGroup = new kafka.ConsumerGroup(Object.assign({ id: 'consumer' + uuidv4() }, consumerOptions), topics);
  consumerGroup.on('error', onError);
  consumerGroup.on('message', handler);
  console.log("Kafka Consumer - added message handler and added topic");
}

function onError(error) {
  console.error(error);
  console.error(error.stack);
}

process.once('SIGINT', function () {
  async.each([consumerGroup], function (consumer, callback) {
    consumer.close(true, callback);
  });
});


//from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}