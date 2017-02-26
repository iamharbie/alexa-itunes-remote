/**
 * This lambda function passes Alexa intents to the Alexa Music Control App utilising the user2uuid -> uuid2ip
 * data in dynamo
 */
var config = {
    appname: 'Music Control'
};
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

/** 
 * This is invoked by AWS in response to an Alexa request for this skill.
 */
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);
 
        // For future use, note the session start event
        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        // The request to pair with the app needs to be handled separately
        if (event.request.type === "IntentRequest" && event.request.intent.name === "PairApp")
        {
            onPairApp(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        }
        // Launch and Intent requests can be sent to the app
        else if (event.request.type === "LaunchRequest" || event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } 
        // For future use, note the session end request
        else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Session started event
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);
}

/**
 * Pairing intent 
 */
function onPairApp(intentRequest, session, callback) {
    var user = session.user.userId;
    var pairCode = Math.floor(Math.random()*1000000).toString();
    console.log("onPairApp user: " + user + ", paircode: " + pairCode);

    // Store the paircode in the paircode2user table
    dynamo.putItem({
            TableName: 'paircode2user',
            Item: {
                paircode: pairCode,
                user: user,
                timestamp: Date.now()
            }
        }, function(err,res)
        {
            // And tell the user what the pairing code was
            var text = err ? ("There was a problem generating a pair code: " + err)
            : ("Please enter the app pairing code " + pairCode.split('').join(' ') + " into the Alexa Music Control app");
            var sessionAttributes = {};
            callback(
                sessionAttributes,
                buildSpeechletResponse(config.appname, 
                text,
                null,true));
        });
}

/**
 * All other intents and the launch request are passed to the app
 */
function onIntent(intentRequest, session, callback)
{
    var http = require('http');
    var user = session.user.userId;
    console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId + ", user=" + user);
    
    // Query the ip and port for this user from the database
    getIpPort(user, function(err,res){
        if (err) {
            // Todo - maybe use a session to walk the user through the steps...
            callback({}, buildSpeechletResponse(config.appname, "Not paired with Alexa Music Control app - install it and then ask 'Alexa, ask Music Control to pair with the app'", null, true));
        } 
        else {
            invokeApp(intentRequest, session, res, callback);
        }
    });

    var invokeApp = function(intentRequest, session, ipPort, callback)
    {
        // build the http request
        var postData = JSON.stringify({
            "session":session,
            "intent":intentRequest.intent
        });
        var options = {
            hostname: ipPort.ip,
            port: ipPort.port,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        console.log(options);
        
        var req = http.request(options, (res) => {
            var responseString = '';
        
            res.on('data', function (data) {
                responseString += data;
            })
        
            res.on('end', function () {
                var repromptText = "";
                var sessionAttributes = {};
                var response = responseString ? JSON.parse(responseString) : { text: 'Oops! Something went wrong!' };
                var speechOutput = response.text;
                var shouldEndSession = response.shouldEndSession;
                if (response.sessionAttributes)
                    sessionAttributes = response.sessionAttributes;
                if (response.repromptText)
                    repromptText = response.repromptText;
                callback(sessionAttributes,
                    buildSpeechletResponse(config.appname, speechOutput, repromptText, shouldEndSession));
            });
            
        });
        req.write(postData);
        req.end();
    };
}

/**
 * For future use, the session end event (when the user ends the session)
 * Not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);
}

/**
 * Util to query the database for the ip and port for a given user
 * Note it uses two queries... Future enhancement would be to revise the database structure so that
 * you can get it in one hit
 */
function getIpPort(user,callback) {
    dynamo.getItem({
            TableName : "user2uuid",
            Key: { "user": user },
        }, (err, res) => {
            if (err) callback(err);
            else if (!res.Item) callback("Not paired");
            else
            {
                // We got the user2uuid record, now query for the ip address
                dynamo.getItem({
                    TableName : "uuid2ip",
                    Key: { "uuid": res.Item.uuid }
                },
                (err, res) => {
                    if (err) callback(err);
                    else if (!res.Item) callback("No IP address record");
                    else callback(null,
                    {
                        ip: res.Item.ip,
                        port: 8888 // todo add this to the schema as well
                    });
                });
            };
        }
    );
};

/**
 * Helpers that build the response structures
 */
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}
