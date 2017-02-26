/**
 * In order to pair, 
 * - the user tells the Siri to pair 
 * - the Lambda function intercepts this directly and generates a pairing code
 * - the Lambda function stores the pairing code, user id and timestamp in the database table paircode2userid
 * 
 * - the user enters the pair code into the UI
 * - the UI calls the pair method with that code
 * - the pair method calls the API Gateway function with the uuid and the pair code ?uuid=123&paircode=abc
 * 
 * - the API Gateway lambda function checks if a pair request has been made for that code, getting the 
 * - user and then writes to user2uuid
 * 
 * In order to keep the AWS services updated about the IP address
 * - when the public ip changes OR on startup OR every hour (just to be safe)
 *   - call ipnotify2?uuid=1234 and the lambda function gets the ip address of the requestor and stores in uuid2ip
 */
var debug = require('debug')('ipnotify');
var https = require('https');

// establish our uuid
var nconf = require('nconf');
nconf.file(__dirname + "/config.json");
var uuid = nconf.get("uuid");
if (!uuid) {
    nconf.set("uuid", uuid = require('node-uuid').v1());
    nconf.save();
}
debug('uuid is ' + uuid);

var connected = false;

/**
 * Attempts to pair - check connected to see eventual outcome
 */
module.exports.pair = function(paircode) {
    notify(paircode);
}

/**
 * Returns true if we are getting the 'connected' indicator from the server
 */
module.exports.isConnected = function() {
    return connected == true;
}

/**
 * Trigger an ip address notification immediately
 * If paircode is set, sends the pairing code as well
 */
var notify = function(paircode) {
        
    var options = {
        hostname: '1ehpwx3wo0.execute-api.us-east-1.amazonaws.com',
        path: '/prod/ipnotify2?uuid='+uuid,
        method: 'GET',
        headers: {'x-api-key': 's9WAde6iQ557mEEwANgcjjRzl58mOJ29uvFTOmO5' }
    };
    if (paircode) 
        options.path += '&paircode='+paircode;
    
    debug('path: ' + options.path);

    var req = https.request(options, function(res) {
        var data = [];
        res.on('data', function(chunk) {
            data.push(chunk);
        });
        res.on('end', function() {
            var body = data.join('');
            debug('RESPONSE RAW: ' + body);
            var result = JSON.parse(body);
            connected = result.connected;
            debug('RESPONSE: ' + JSON.stringify(result));
        });
        debug('STATUS: ' + res.statusCode);
        debug('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
    });

    req.on('error', function(e) {
        debug('problem with request: ' + e.message);
        connected = false;
    });

    req.end();
}

// run immediately
notify();

// run every hour 
setInterval(notify, 60*60*1000);

// run on public IP address change (to do)
