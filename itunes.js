var nconf = require('nconf');
var SERVER = nconf.get('SERVER');
if (!SERVER) SERVER = {};
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
    nconf.set('SERVER',serverConfig);
    nconf.save();
});

client.on('error', function(error) {
    console.log("ERROR", error);
});

var first = true;
client.on('status', function(status) {
    console.log("STATUS", status);
    if (first)
    {
          first = false;
         // module.exports.unpair();
    }
});

// login after successful pairing
client.on('paired', function() {
  console.log('PAIRED - LOGGING IN');
  setTimeout(function() {
    client._login(function(error,response) {
      console.log('LOGIN CALLBACK ',error,response);
    });
  },1000);
});

module.exports.pair = function(callback)
{

  client.once('passcode', function(passcode) {
    // Provides the 4-digit passcode that must be entered in iTunes
    console.log("REQUESTED PASSCODE", passcode);
    callback(null,passcode);
  });
  client.status = 'initializing';
  client.config = {
		serverPort: 3689,
		subscribe: true
	};
  client._pair();
  nconf.set('SERVER',null);
  nconf.save();


}

module.exports.isPaired = function()
{
  return true && nconf.get('SERVER');
}

module.exports.nextSong = function(callback) {
  client.sessionRequestIfReady('ctrl-int/1/nextitem', {}, function(error, response) {
  if (error) callback(error);
    else callback(null);
  });
};


module.exports.previousSong = function(callback) {
  client.sessionRequestIfReady('ctrl-int/1/previtem', {}, function(error, response) {
    if (error) callback(error);
    else callback(null);
  });
};


module.exports.pause = function(callback)
{
  // Get the player's status
  client.sessionRequestIfReady('ctrl-int/1/playstatusupdate', {'revision-number': 1}, function(error, response) {
    if (error) callback(error);
    else if (response.caps == 3) 
      callback("Already paused");
    else
    {
      // playing - send pause request
      client.sessionRequestIfReady('ctrl-int/1/playpause', {}, function(error, response) {
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
    client.sessionRequestIfReady('ctrl-int/1/playstatusupdate', {'revision-number': 1}, function(error, response) {
    if (error) callback(error);
    else if (response.caps == 4) {
      callback("Already playing");
    }
    else
    {
      // playing - send pause request
      client.sessionRequestIfReady('ctrl-int/1/playpause', {}, function(error, response) {
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
      client.sessionRequestIfReady('ctrl-int/1/volumeup', {}, function(error, response) {
          console.log(error, response);
        });
    }
    callback();
};

/* Pause played current song in iTunes */
module.exports.volumeDown = function(callback) {
    for (var i = 0;i < 2;i ++)
    {
        client.sessionRequestIfReady('ctrl-int/1/volumedown', {}, function(error, response) {
          console.log(error, response);
        });
    }
    callback();
};
  
var getSpeakerIdText = function(id)
{
  return (id == 0) ? "0" : ("0x"+id.toString(16).toUpperCase());
}

/* Accepts a list of the speakers to enable (as returned by getSpeakers */
module.exports.setSpeakers = function(list,callback)
{
  var idString = list.map(function(i) { return getSpeakerIdText(i.id); }).join(",");
  console.log(idString);
  
  client.sessionRequestIfReady('ctrl-int/1/setspeakers',{'speaker-id':idString}, function(error, response) {
    if (error) callback(error);
    else callback(null);
  });  
}

// response, if no error, is an array of speaker objects
// with name, setVolume(callback)
module.exports.getSpeakers = function(names,callback,masterVolume)
{
  // capitalise the speaker names if used
  if (!names) names = [];
  for (var j = 0;j < names.length;j++)
    names[j] = names[j].toUpperCase();

  // request master volume (single-level recursion)
  if (!masterVolume) {
    client.sessionRequestIfReady('ctrl-int/1/getproperty',
      {'properties':'dmcp.volume'},
      function(error,response)
      {
        if (error) callback(error);
        else return module.exports.getSpeakers(names,callback,response.cmvo);
      }
    );
    return;
  }

  // request the list of speaker data
  client.sessionRequestIfReady('ctrl-int/1/getspeakers',{}, function(error, response) {
    if (error) callback(error)
    else {
      console.log(response);
      var s = response.mdcl

      // filter for the speakers identified in the names array
      .filter(function(element) { 
      return (names.length == 0) || (names.indexOf(element.minm.toUpperCase())>= 0);
      })
      .map(function(element){
        return {
          name: element.minm,
          // the speaker volume is returned as a relative number, but the setVolume
          // command uses the absolute, so convert to absolute using the master
          volume: (!element.caia || !element.cmvo)?0:element.cmvo * masterVolume/100,
          isActive: element.caia ? true : false,
          id: element.msma ? element.msma : 0
        };
      });
      if ((names.length > 0) && (names.length != s.length))
        callback("Didn't find the specifed speaker " + names.join(' and '),s);
      else 
        callback(null,s);
    }
  });
}

// speaker is an element of the array returned by getSpeakers
module.exports.setSpeakerVolume = function(speaker,v,callback) {
  if (!speaker.isActive) callback('Speaker not active',null);
  else { 
    console.log("set volume of " + speaker.name + " to " + v);
    client.sessionRequestIfReady('ctrl-int/1/setproperty',
    { 
      'dmcp.volume':v,
      'include-speaker-id':getSpeakerIdText(speaker.id)
    }
    ,callback);
  }
}