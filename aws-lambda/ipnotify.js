/**
 * API Gateway lambda function that is invoked by the app in order to record the ip address to send
 * invocations to, as well as facilitate the pairing process 
 */
'use strict';
const doc = require('dynamodb-doc');

/* For local development only, need to do this */
var AWS = require('dynamodb-doc/node_modules/aws-sdk');
AWS.config.update({
    region: "us-east-1",
    endpoint:"dynamodb.us-east-1.amazonaws.com"
});

const dynamo = new doc.DynamoDB();

/**
 * HTTP endpoint using API Gateway
 */
exports.handler = (event, context, callback) => {
    var sourceIp = event.requestContext.identity.sourceIp;
    var uuid = event.queryStringParameters.uuid;
    var paircode = event.queryStringParameters.paircode; 
    console.log('source ip: ' + sourceIp + ', uuid: ' + uuid + ', paircode: ' + paircode);
   
    // The steps are defined in reverse order and called through a chain of callbacks

    // The last step, calls the callback with the response
    var done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    
    // The second last step checks if we're connected and invokes done
    var checkConnected = (err, res) => {        
        if (err)
            console.log('error before check connected ' + err + '\n\n' + err.stack);
        
        var connected = false;
        console.log('querying ...');
        dynamo.query({
            TableName : "user2uuid",
            IndexName: "uuid-index",
            KeyConditionExpression: "#uuid = :uuid",
            ExpressionAttributeNames:{
                "#uuid": "uuid"
            },
            ExpressionAttributeValues: {
                ":uuid":uuid
            }
        }, (err, res) => {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                done(err,null);
            } else {
                connected = res.Count > 0;
                console.error("Connected query result: ", JSON.stringify(res));

                console.log("Query succeeded, connected = " + connected);
                done(null,{"connected":connected});
            }
        });
    };
    
    // the recordIp step stores the ip address in uuid2ip
    var recordIp = function(err,res) {
        console.log('putting...');
        dynamo.putItem({
            TableName: 'uuid2ip',
            Item: {
                uuid: event.queryStringParameters.uuid,
                ip: event.requestContext.identity.sourceIp,
                timestamp: Date.now()
            }
        }, checkConnected);
    }
    
    // the optional pair step stores the paircode in paircode2user
    var pair = function(err,res) {
        if (err)
            console.log('error before pair ' + err + '\n\n' + err.stack);
        
        console.log('querying for paircode ...');
        dynamo.getItem({
            TableName : "paircode2user",
            Key: {"paircode": paircode},
        }, (err, res) => {
            if (err) {
                console.error("Unable to pair. Error:", JSON.stringify(err, null, 2));
                recordIp(err,null);
            } else {
                if (res.Item)
                {
                    console.error("Paired query result: ", JSON.stringify(res));

                    var pairoptions = {
                        TableName: 'user2uuid',
                        Item: {
                            uuid: event.queryStringParameters.uuid,
                            user: res.Item.user,
                            timestamp: Date.now().toString()
                        }
                    };
                    console.error("Paired! Putting: ", JSON.stringify(pairoptions));
                
                    dynamo.putItem(pairoptions, recordIp);
                }
                else 
                {
                    console.log("Failed to pair");
                    recordIp();
                }
            }
        });
    }

    // Depending on whether a paircode is supplied, start at with the pair or recordIp steps
    if (paircode) 
        pair();
    else
        recordIp();
};
