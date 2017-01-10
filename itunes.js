//var SERVER = { pair: '09B63545F31CF5C1', serviceName: '4E6D0DFFC6C0CE2F' }; // mikemac
var SERVER = { pair: 'FEEDB511B2ABFB18', serviceName: '2D64252F6F8B15B1' }; // projector shelf

var client = require('dacp-client')(SERVER);//(SERVER);

client.on('passcode', function(passcode) {
    // Provides the 4-digit passcode that must be entered in iTunes
    console.log("PASSCODE", passcode);
});

client.on('paired', function(serverConfig) {
    // Save the serverConfig object, and pass it in as config for future requests
    // Will look something like this: { pair: '21C22EDCEAD6A892', serviceName: '5380431DD0AFAB75' }
    // The service name will remain constant, even if the server's IP changes
    console.log("SERVER", serverConfig);
});

client.on('error', function(error) {
    console.log("ERROR", error);
});

client.on('status', function(status) {
    console.log("STATUS", status);
});


client.sessionRequest('ctrl-int/1/playpause', function(error, response) {
    // Play or pause
    console.log(error, response);
});


module.exports.pause = function(res)
{
  // Get the player's status
  client.sessionRequest('ctrl-int/1/playstatusupdate', {'revision-number': 1}, function(error, response) {
    if (response.caps == 3) {
      res.json({
        text: "Already paused",
        shouldEndSession: true
      });
    }
    else
    {
      // playing - send pause request
      client.sessionRequest('ctrl-int/1/playpause', {}, function(error, response) {
          // Play or pause
          console.log(error, response);
        });
      res.json({
          text: "Paused",
          shouldEndSession: true
        });
    }
  });
}

module.exports.resume = function(res)
{
    // Get the player's status
    client.sessionRequest('ctrl-int/1/playstatusupdate', {'revision-number': 1}, function(error, response) {
    if (response.caps == 4) {
      res.json({
        text: "Already playing",
        shouldEndSession: true
      });
    }
    else
    {
      // playing - send pause request
      client.sessionRequest('ctrl-int/1/playpause', {}, function(error, response) {
          // Play or pause
          console.log(error, response);
        });
      res.json({
          text: "Playing",
          shouldEndSession: true
        });
    }
  });
}

// basic test
// testRes = {};
// testRes.json = function() {};
// pause(testRes);





  //  public void controlVolume(long volume) {
  //     // http://192.168.254.128:3689/ctrl-int/1/setproperty?dmcp.volume=100.000000&session-id=130883770
  //     this.fireAction(String.format("%s/ctrl-int/1/setproperty?dmcp.volume=%s&session-id=%s", this.getRequestBase(), volume, this.sessionId), false);
  //  }


module.exports.nextSong = function(res) {
  client.sessionRequest('ctrl-int/1/nextitem', {}, function(error, response) {
        // Play or pause
        console.log(error, response);
      });
    res.json({
        text: "",
        shouldEndSession: true
      });
};


module.exports.prevSong = function(res) {
  client.sessionRequest('ctrl-int/1/previtem', {}, function(error, response) {
        // Play or pause
        console.log(error, response);
      });
    res.json({
        text: "",
        shouldEndSession: true
      });
};


module.exports.pause = function(res)
{
  // Get the player's status
  client.sessionRequest('ctrl-int/1/playstatusupdate', {'revision-number': 1}, function(error, response) {
    if (response.caps == 3) {
      res.json({
        text: "Already paused",
        shouldEndSession: true
      });
    }
    else
    {
      // playing - send pause request
      client.sessionRequest('ctrl-int/1/playpause', {}, function(error, response) {
          // Play or pause
          console.log(error, response);
        });
      res.json({
          text: "Paused",
          shouldEndSession: true
        });
    }
  });
}

module.exports.resume = function(res)
{
    // Get the player's status
    client.sessionRequest('ctrl-int/1/playstatusupdate', {'revision-number': 1}, function(error, response) {
    if (response.caps == 4) {
      res.json({
        text: "Already playing",
        shouldEndSession: true
      });
    }
    else
    {
      // playing - send pause request
      client.sessionRequest('ctrl-int/1/playpause', {}, function(error, response) {
          // Play or pause
          console.log(error, response);
        });
      res.json({
          text: "Playing",
          shouldEndSession: true
        });
    }
  });
}



module.exports.volumeUp = function(callback) {
    for (var i = 0;i < 2;i ++)
    {
      client.sessionRequest('ctrl-int/1/volumeup', {}, function(error, response) {
          console.log(error, response);
        });
    }
    callback();
};

/* Pause played current song in iTunes */
module.exports.volumeDown = function(callback) {
    for (var i = 0;i < 2;i ++)
    {
        client.sessionRequest('ctrl-int/1/volumedown', {}, function(error, response) {
          console.log(error, response);
        });
    }
    callback();
};