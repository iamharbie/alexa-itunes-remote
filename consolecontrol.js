/**
 * Haven't done a UI for this app yet so this is just a simple console interface to allow the 
 * user to trigger the app pairing process
 */
var itunes = require('./itunes.js');
var util = require('util');
var ipnotify = require('./ipnotify');

process.stdin.resume();
process.stdin.setEncoding('utf8');
console.log('To pair with Alexa, enter p123456 and press enter, where 123456 is the app pair code you get from Alexa (Alexa, ask iTunes to pair with the app)');
process.stdin.on('data', function (text) {
  console.log('received data:', util.inspect(text));

  if (text[0] == 'p')
  {
    ipnotify.pair(text.substring(1).trim());
    console.log('pair request sent..');
  }

  if (text === 'quit\n') {
    done();
  }
});
