var request = require('request')
    ;
var http = require("http");

//this module talks to a locally running Redis Cache

var localCacheAPI = module.exports;
var moduleName = "accs.localCacheAPI";
var moduleVersion = "0.8.7";
var Redis = require("redis");

var localLoggerAPI = require("./local-logger-api.js");
var APP_NAME = "WorkflowLauncher"

var redisHost = process.env.REDIS_HOST || "192.168.99.100";
var redisPort = process.env.REDIS_PORT || 30159;

var cacheInspectorServiceHost = "192.168.99.100";
var cacheInspectorServicePort = "32507";

var callViaAPI = false;

var redisClient;

if (!callViaAPI) redisClient = Redis.createClient({ "host": redisHost, "port": redisPort });

var cacheAPIOptions = {
    "method": "GET",
    "hostname": cacheInspectorServiceHost,
    "port": cacheInspectorServicePort,
    "path": "/cacheEntry",
    "headers": {
        "cache-control": "no-cache",
    }
};
localCacheAPI.getFromCache = function (key, callback) {
    if (callViaAPI) {
        try {
            localLoggerAPI.log(`Try get document from cache inspector service with key  ${key}`
            , APP_NAME, "info")

            cacheAPIOptions.path = "/cacheEntry?key=" + key;
            cacheAPIOptions.method = "GET";
            var req = http.request(cacheAPIOptions, function (res) {
                var chunks = [];

                res.on("data", function (chunk) {
                    chunks.push(chunk);
                });

                res.on("end", function () {
                    var body = Buffer.concat(chunks);
                    localLoggerAPI.log(`Successfully retrieved doc with  ${key} from cacheinspector service ${body}`
                    , APP_NAME, "info")

                    console.log(body.toString());
                    callback(JSON.parse(body));
                });
            });

            req.end();
        } catch (err) {
            localLoggerAPI.log(`ERROR in accessing cacheinspector  -exception ${e}`
            , APP_NAME, "error")
            console.log("Exception : " + err)
        }
    } else {
        try {
            console.log("get document from cache api with key " + key);
            redisClient.get(key, function (err, reply) {
                if (err) {
                    localLoggerAPI.log(`Failed to get document with  ${key} resulting in exception ${err}`
                    , APP_NAME, "error")
                    console.error('ERROR in getting document from cache ' + err);
                    callback(null);
                } else {
                    localLoggerAPI.log(`Successfully retrieved doc with  ${key} ${reply}`
                    , APP_NAME, "info")
                    callback(JSON.parse(reply));
                }//else
            });//get
        } catch (e) {
            localLoggerAPI.log(`ERROR in accessing redis  -exception ${e}`
            , APP_NAME, "error")
            console.error('ERROR i  n accessing redis ' + e);
            callback(null);
        }
    }
}//getFromCache

localCacheAPI.putInCache = function (key, value, callback) {
    if (callViaAPI) {
        try {
            cacheAPIOptions.path = "/cacheEntry";
            cacheAPIOptions.method = "POST";
            var req = http.request(cacheAPIOptions, function (res) {
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
                key: key,
                document: value
            }));
            req.end();
        } catch (err) {
            console.log("Exception : " + err)
        }
    }
    else {
        try {
            console.log("putInCache Callback = " + callback);
            redisClient.set(key, JSON.stringify(value));
            callback("Put in cache");
        } catch (e) {
            callback("Failed to put in cache " + JSON.stringify(e));
        }
    }
}//putInCache


console.log("Local Cache API (version " + moduleVersion + ") initialized running against Redis instance at " + redisHost + ":" + redisPort);
