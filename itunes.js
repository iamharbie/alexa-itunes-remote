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

var first = false;
client.on('status', function(status) {
    console.log("STATUS", status);
    if (first)
    {
          first = false;
          module.exports.unpair();
    }
});

module.exports.unpair = function()
{
  client.config.pair = undefined;
  client.config.serviceName = undefined;
  client.config.sessionId = undefined;
  client.status = 'initializing';
  client._pair(function(error, response) {
    console.log(error,response);
  });
}

module.exports.nextSong = function(callback) {
  client.sessionRequest('ctrl-int/1/nextitem', {}, function(error, response) {
  if (error) callback(error);
    else callback(null);
  });
};


module.exports.previousSong = function(callback) {
  client.sessionRequest('ctrl-int/1/previtem', {}, function(error, response) {
    if (error) callback(error);
    else callback(null);
  });
};


module.exports.pause = function(callback)
{
  // Get the player's status
  client.sessionRequest('ctrl-int/1/playstatusupdate', {'revision-number': 1}, function(error, response) {
    if (error) callback(error);
    else if (response.caps == 3) 
      callback("Already paused");
    else
    {
      // playing - send pause request
      client.sessionRequest('ctrl-int/1/playpause', {}, function(error, response) {
          // Play or pause
          callback(null, "Playing");
          console.log(error, response);
        });
    }
  });
}

module.exports.resume = function(callback)
{
    // Get the player's status
    client.sessionRequest('ctrl-int/1/playstatusupdate', {'revision-number': 1}, function(error, response) {
    if (error) callback(error);
    else if (response.caps == 4) {
      callback("Already playing");
    }
    else
    {
      // playing - send pause request
      client.sessionRequest('ctrl-int/1/playpause', {}, function(error, response) {
          // Play or pause
          callback(null,"Playing");
          console.log(error, response);
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
  
/* Accepts a list of the speakers to enable (as returned by getSpeakers */
module.exports.setSpeakers = function(list,callback)
{
  var idString = list.map(function(i) { return (i.id == 0) ? "0" : ("0x"+i.id.toString(16).toUpperCase()) }).join(",");
  console.log(idString);
  
  client.sessionRequest('ctrl-int/1/setspeakers',{'speaker-id':idString}, function(error, response) {
    if (error) callback(error);
    else callback(null);
  });  
}

// response, if no error, is an array of speaker objects
// with name, setVolume(callback)
module.exports.getSpeakers = function(callback)
{
  client.sessionRequest('ctrl-int/1/getspeakers',{}, function(error, response) {
    if (error) callback(error)
    else {
      console.log(response);
      var s = response.mdcl.map(function(element){
        return {
          name: element.minm,
          volume: element.cmvo,
          isActive: element.caia ? true : false,
          id: element.msma ? element.msma : 0,
          setActive: function(a,callback) {
            console.log("set active of " + element.minm + " to " + a);
          },
          setVolume: function(v,callback) {
              console.log("set volume of " + element.minm + " to " + v);
          }
        };
      });
      callback(null,s);
    }
  });
}