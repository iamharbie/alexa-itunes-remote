/**
 * Some entrypoints to allow control via stdin (mainly for testing but in the future
 * possibly for pairing the server with the lambda function)
 */
var itunes = require('./itunes.js');
var util = require('util');
 process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', function (text) {
    console.log('received data:', util.inspect(text));

    if (text === 'p\n') {
      itunes.resume(function(error,response) {
          console.log('resume ',error,response);
      });
    }

    if (text === 'c\n') {
      itunes.pair(function(error,response) {
          console.log('pair(connect) ',error,response);
      });
    }


    if (text === 'quit\n') {
      done();
    }
  });
