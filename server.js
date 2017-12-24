/**
 * This is the skill server itself, which responds to requests from the lambda function to control itunes
 * 
 * The intents object stores the intents, keyed by the Amazon intent name. value is a function(body,res)
 * The states object is keyed by a state identifier and each value is the set of intents that can be 
 * handled in that state.
 * 
 * The res callback has methods for the various things a handler could do
 *   speak(message) - say something back to the user via the Echo
 *   end() - silent response
 *   enterState(state,text,attributes) - specify that we are now in the 'state' state
 */

var dns = require('dns');
var app = (require('express'))();
var url = require('url');
var bodyParser = require('body-parser');
var nconf = require('nconf');
nconf.file(__dirname + "/config.json");

var itunes = require('./itunes');
var consolecontrol = require('./consolecontrol.js');
var ipnotify = require('./ipnotify');

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

// intents are registered in this object with key = the intent name from Alexa
// the function is what will be called with (req.body,res) 
// (body has .session.attributes and .slots)
// and will return res.json({text,shouldEndSession,sessionAttributes,repromptText})
// if sessionAttributes.state is defined, the states are checked first for intents
// with a fallback to the main intents
var intents = {}

var states = {}

intents["AMAZON.ResumeIntent"] = 
intents["Play"] = function(body,res) {
    itunes.resume(function(error,response){
        if (error) 
            res.speak(error);
        else 
            res.end();
    });
}

intents["AMAZON.PauseIntent"] = 
intents["Stop"] = function(body,res)
{
    itunes.pause(function(error) {
        if (error) res.speak(error);
        else res.end();
    });
}

intents["Next"] = function(body,res) {
    itunes.nextSong(function(error) {
        if (error) res.speak(error);
        else res.end();
    });
}

intents["Previous"] = function(body,res) {
    itunes.previousSong(function(error) {
        if (error) res.speak(error);
        else res.end();
    });
}
   
intents['VolumeUp'] = function(body,res) {
    itunes.volumeUp(function(error){
        if (error) 
            res.speak(error);
        else 
            res.enterState('VolumeUp','More?');
    })
}
states['VolumeUp'] = {
    // recycle the stateless intent handler
    'Yes': intents['VolumeUp'],
    'No': function(body,res) { res.end(); }
};

intents['VolumeDown'] = function(body,res) {
    itunes.volumeDown(function(error){
        if (error) 
            res.speak(error);
        else 
            res.enterState('VolumeDown','More?');
    })
}
states['VolumeDown'] = {
    // recycle the stateless intent handler
    'Yes': intents['VolumeDown'],
    'No': function(body,res) { res.end(); }
};

intents['PlaySong'] = function(body,res) {
    res.speak("Play hasn't been programmed yet sorry - try pause, play, volume up or down, or next.");
};


/* Speaker control */
intents['ListSpeakers'] = function(body,res) {
    itunes.getSpeakers([],function(error,speakers) {
        if (error) 
            res.speak(error);
        else 
            res.speak("Available speakers are " + speakers.map(function(s) { return s.name; }).join(" "));
    });
}

intents['SelectAllSpeakers'] = function(body,res) {
    itunes.getSpeakers([],function(error, speakers) {
        if (error) res.speak(error);
        else itunes.setSpeakers(speakers,function(error) {
            if (error) res.speak(error);
            else res.end();
        });
    });
}

intents['SelectOneSpeaker'] = function(body,res) {
    itunes.getSpeakers([],function(error, speakers) {
        if (error) res.speak(error);
        else 
        {
            console.log(body);
            var speakerOne = body.intent.slots['SpeakerOne'].value.toUpperCase();
            var search = speakers.filter(function(i) { return i.name.toUpperCase() == speakerOne });
            if (search.length == 0) res.speak("Did not recognise the speaker " + speakerOne);
            else 
                itunes.setSpeakers(search,function(error) {
                    if (error) res.speak(error);
                    else res.end();
                });
        }
    });
}

intents['SelectTwoSpeakers'] = function(body,res) {
    itunes.getSpeakers([],function(error, speakers) {
        if (error) res.speak(error);
        else 
        {
            console.log(body);
            var speakerOne = body.intent.slots['SpeakerOne'].value.toUpperCase();
            var speakerTwo = body.intent.slots['SpeakerTwo'].value.toUpperCase();
            var search = speakers.filter(function(i) { 
                return i.name.toUpperCase() == speakerOne ||
                       i.name.toUpperCase() == speakerTwo });
            if (search.length != 2) res.speak("Did not recognise the speakers " + speakerOne + " and " + speakerTwo);
            else 
                itunes.setSpeakers(search,function(error) {
                    if (error) res.speak(error);
                    else res.end();
                });
        }
    });
}

var volumeStep = 10;

intents['SpeakerVolumeUp'] = function(body,res) 
{
    itunes.getSpeakers([body.intent.slots['SpeakerOne'].value],
        function(error, speaker) {
            if (error) res.speak(error);
            else if (!speaker[0].isActive) res.speak("The " + speaker[0].name + " speaker is not active");
            else {
                itunes.setSpeakerVolume(speaker[0], Math.min(100,speaker[0].volume + volumeStep),
                function(error,response) {
                    if (error) res.speak(error);
                    else res.enterState("SpeakerVolumeUp","More?",{
                        speaker: body.intent.slots['SpeakerOne'].value
                    })
                });
            }
        });
}


states['SpeakerVolumeUp'] = 
{ 
    'Yes': function(body,res) {
        itunes.getSpeakers([body.session.attributes.speaker],
            function(error, speaker) {
                if (error) res.speak(error);
                else {
                    itunes.setSpeakerVolume(speaker[0],Math.min(100,speaker[0].volume + volumeStep),
                    function(error,response) {
                        if (error) res.speak(error);
                        else res.enterState("SpeakerVolumeUp","More?",{
                            speaker:body.session.attributes.speaker
                        })
                    });
                }
        })
    },
    'No': function(body,res) { res.end(); }
}

intents['SpeakerVolumeDown'] = function(body,res) 
{
    itunes.getSpeakers([body.intent.slots['SpeakerOne'].value],
        function(error, speaker) {
            if (error) res.speak(error);
            else if (!speaker[0].isActive) res.speak("The " + speaker[0].name + " speaker is not active");
            else {
                itunes.setSpeakerVolume(speaker[0], Math.min(100,speaker[0].volume - volumeStep),
                function(error,response) {
                    if (error) res.speak(error);
                    else res.enterState("SpeakerVolumeDown","More?",{
                        speaker: body.intent.slots['SpeakerOne'].value
                    })
                });
            }
        });
}

states['SpeakerVolumeDown'] = 
{ 
    'Yes': function(body,res) {
        itunes.getSpeakers([body.session.attributes.speaker],
            function(error, speaker) {
                if (error) res.speak(error);
                else {
                    itunes.setSpeakerVolume(speaker[0],Math.max(0,speaker[0].volume - volumeStep),
                    function(error,response) {
                        if (error) res.speak(error);
                        else res.enterState("SpeakerVolumeDown","More?",{
                            speaker:body.session.attributes.speaker
                        })
                    });
                }
        })
    },
    'No': function(body,res) { res.end(); }
}

states['PairConfirm'] = {
    'Yes': function(body,res) {
        itunes.pair(function(error,passcode) {
            if (error) res.speak(error);
            else {
                res.speak("Enter the passcode " + passcode + " in iTunes or whichever DACP compliant music player you are using");
            }
        });
    },
    'No': function(body,res) {
        res.end();
    }
}

intents['PairiTunes'] = function(body,res)
{
    if (itunes.isPaired())
    {
        res.enterState("PairConfirm", "I believe I am already paired - are you sure you would like to unpair and pair again?");
    }
    else states['PairConfirm']['Yes'](body,res);
}

/* Generic Handler */
app.post('/', function (req, res) {
  try {
    //console.log("body",req.body);
    var json = req.body.intent;
    var resObj = {
        // simple speech response
        speak: function(text) {
            res.json({
                text: text,
                shouldEndSession: true
            });
        },
        // silent response
        end: function() {
            res.json({
                text:"",
                shouldEndSession: true
            });
        },
        // response and go to state
        enterState: function(state,text,attributes)
        {
            if (!attributes) attributes = {};
            attributes.state = state;
            res.json({
                text:text,
                shouldEndSession: false,
                sessionAttributes: attributes
            })
        }
    };
    // check for state
    if (req.body.session && req.body.session.attributes 
        && req.body.session.attributes.state
        && states[req.body.session.attributes.state]
        && states[req.body.session.attributes.state][json.name])
    {
        // we have a state and an intent to apply within that state
        states[req.body.session.attributes.state][json.name](req.body,resObj);
    }
    else if (intents[json.name])
    {
        intents[json.name](req.body,resObj);
    }
    else
      resObj.speak("Sorry - the " + json.name + " intent is not programmed");
  } catch (e)
  {
      console.error(e);
      resObj.speak("There was a problem: " + e.message);
  }
});
