var assert = require('assert');
var DOC = require("dynamodb-doc");

var docClient = new DOC.DynamoDB();
docClient.config.update({region: "us-east-1"});

var sourceIp = '127.0.0.1';
var ipnotifyLambda = require('./ipnotify.js');
var alexaLambda = require('./alexa-skill.js');

var callIpnotify = function(uuid,paircode,callback)
{
    var event = {
        requestContext: {
            identity: { sourceIp: sourceIp } 
        },
        queryStringParameters:{
            uuid: uuid,
            paircode: paircode  
        } 
    };
    var context = {};
    ipnotifyLambda.handler(event, context, callback);
}

var callAlexa = function(user,intent,context)
{
    var event =
    {
        session: { 
            application: "mocha test",
            new: false,
            user: {
                     userId: user
                 }
         },
         request: {
             type: "IntentRequest",
             intent: { name: intent }
         },
         context: {
             System: {
                 
             }
         }
    };
    alexaLambda.handler(event,context);
}

describe('ipnotify endpoint ', function() {
    it('should not throw an exception when notifying ip', function(done) {
        callIpnotify("abc",null,function(err, res)
        {
            assert.ok(res);
            assert.ok(!err);
            assert.equal(res.statusCode,"200");
            done();
        });
    });
});

describe('end to end pairing and notification', function() {
    var pairCode;
    it('should let us initiate the pairing process via the Alexa skill', function(done)
    {
        callAlexa("mike","PairApp",{
            succeed: function(res) { 
                var regex = /pairing code ([0-9 ]+) /g;
                pairCode = regex.exec(res.response.outputSpeech.text)[1];
                pairCode = pairCode.split(' ').join('');
                assert.ok(pairCode);
                done(); 
            },
            fail: function(msg) { assert.fail(msg); }
        });
    });
    it('should not throw an exception when notifying ip', function(done) {
        callIpnotify("abc",pairCode,function(err, res)
        {
            assert.ok(res);
            assert.ok(!err);
            assert.equal(res.statusCode,"200");
            done();
        });
    });
    it('after success ipnotify should indicate we are connected', function(done) {
        callIpnotify("abc",null,function(err, res)
        {
            assert.ok(!err);
            var parsed = JSON.parse(res.body);
            assert.ok(parsed.connected);
            assert.equal(res.statusCode,"200");
            done();
        });
    });
    it('should pass intent to local server', function(done) {
        var http = require('http');
        var invoked = false;
        var server = http.createServer((req, res) => {
            invoked = true;
            res.end();
        });
        server.listen(8888);

        callAlexa("mike","AMAZON.ResumeIntent",{
            succeed: function(res) { 
                assert.ok(invoked);
                done(); 
            },
            fail: function(msg) 
            { 
                assert.fail(msg);
                done(); 
            }
        });
        after(function()
        {
            server.close();
        });
    });
});
