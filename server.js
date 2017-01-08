var itunes = require('./itunes');
var dns = require('dns');
var app = (require('express'))();

var port = 8888;
var host;

dns.lookup(require('os').hostname(), function (err, address, fam) {
    host = address;
    console.log('Listening at http://%s:%s', host,port);      
});

var server = app.listen(port, function () {

});

app.get('/', function (req, res) {
  try {
    var url_parts = url.parse(req.url, true);
    console.log(url_parts.query);
    var json = url_parts.query && url_parts.query.json != undefined && url_parts.query.json != 'undefined' ? JSON.parse(url_parts.query.json) : {};

    // if (json.name == "PlaySong")
    //   playSong(json.slots.Title.value, res);
    if (json.name == "AMAZON.ResumeIntent")
      itunes.resume(res);
    else if (json.name == "AMAZON.PauseIntent")
      itunes.pause(res);
    else if (json.name == "VolumeUp")
        itunes.volumeUp(res);
    else if (json.name == "VolumeDown")
        itunes.volumeDown(res);
    else if (json.name == "Next")
        itunes.nextSong(res);
    
    else
      res.json({
        text: "Sorry - I didn't understand the request.  Try asking me to play a song or music by an artist",
        shouldEndSession: true
      }); 
      return;
  } catch (e)
  {
    res.json({
      text: "There was a problem: " + e.message,
      shouldEndSession: true
    });
  }
});
