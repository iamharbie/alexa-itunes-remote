#!/usr/bin/env node
var itunes = require('./itunes');
var dns = require('dns');
var app = (require('express'))();
var url = require('url');
var bodyParser = require('body-parser');

var port = 8888;
var host;

dns.lookup(require('os').hostname(), function (err, address, fam) {
    host = address;
    console.log('Listening at http://%s:%s', host,port);      
});

// parse application/json 
app.use(bodyParser.json());

var server = app.listen(port, function () {

});

app.post('/', function (req, res) {
  try {
    var url_parts = url.parse(req.url, true);
    console.log("body",req.body);
    console.log(url_parts.query);
    var json = req.body.intent;
    
    if (json.name == "PlaySong")
      res.json({
        text: "Play hasn't been programmed yet sorry - try pause, play, volume up or down, or next.",
        shouldEndSession: true
      });
    else if (json.name == "AMAZON.ResumeIntent")
      itunes.resume(res);
    else if (json.name == "AMAZON.PauseIntent" || json.name == "Stop")
      itunes.pause(res);
    else if (json.name == "VolumeUp")
        itunes.volumeUp(
            function() {
                res.json({
                    text: "More?",
                    shouldEndSession:false,
                    sessionAttributes: { "Repeat": "volumeUp" },
                    repromptText: "Yes or no"
                });
            });
    else if (json.name == "VolumeDown")
        itunes.volumeDown(
            function() {
                res.json({
                    text: "More?",
                    shouldEndSession:false,
                    sessionAttributes: { "Repeat": "volumeDown" },
                    repromptText: "Yes or no"
                });
            });
    else if (json.name == "Yes")
    {
        if (req.body.session.attributes.Repeat)
        {
            itunes[req.body.session.attributes.Repeat](
                function() {
                    res.json({
                        text: "More?",
                        shouldEndSession:false,
                        sessionAttributes: { "Repeat": req.body.session.attributes.Repeat },
                        repromptText: ""
                    });
                }
            )
        } 
        else res.json({text: "", shouldEndSession: true })
    }
    else if (json.name == "No")
    {
        res.json({text: "", shouldEndSession: true })
    }
    else if (json.name == "Next")
        itunes.nextSong(res);
    
    else
      res.json({
        text: "Sorry didn't get that - ask Eedee",
        shouldEndSession: true
      }); 
      return;
  } catch (e)
  {
      console.error(e);
        res.json({
            text: "There was a problem: " + e.message,
            shouldEndSession: true
        });
  }
});
