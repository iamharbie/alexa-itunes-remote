# alexa-itunes-remote
Node server to control iTunes in response to Alexa commands, just like iTunes Remote

Supports commands like...

    Alexa, ask iTunes to pair
    Alexa, ask iTunes to turn the volume up / make it louder
    Alexa, ask iTunes to skip to the next song
    Alexa, ask iTunes to turn up the Bedroom speaker
    Alexa, ask iTunes to play through the Kitchen speaker only
    Alexa, ask iTunes to select the Bedroom and Computer speakers
    Alexa, ask iTunes to play in all rooms

The obvious ommission is "Alexa, ask iTunes to play songs by (insert artist name)" etc - there are no docs on how to search the iTunes library so I have to reverse engineer this one.  May have it running soon though.

# Setup
You need to run this node application on a computer on the same network as the iTunes you want to control
You will leverage the lambda functions that I have created in the AWS
As long as this Alexa skill is not on Alexa app store, you'll need to set up the skill manually

## Node web server
- You will need to forward port 8888 from your router to the machine that this runs on
- You can change the port by modifying server.js (and the Lambda function accordingly)
- Start by running "node server.js" on the command-line.  
- Use pm2 (https://www.npmjs.com/package/pm2) to have it run on startup. (sudo pm2 startup -u <usertorunas>, pm2 start server.js)

## The Amazon Alexa skill
- Sign up if necessary as an Amazon developer and click Add a New Skill
https://developer.amazon.com/edw/home.html#/skills/list
- Set Language to match the language of your Echo (or vice versa).  If you mix US English and UK English it WON'T work

- Paste the interaction model and sample utterances from the .txt files
- Also click Add Slot Type to define a slot type called "SpeakerList" that has values corresponding to the airplay speakers you have connected to iTunes. Just "Computer" is fine if you don't have airplay speakers.
- On Configuration, Endpoint select North America and enter this ARN
arn:aws:lambda:us-east-1:721735688732:function:iTunes
Note you'll also need to set your Alexa to be in US English if it's not (alexa.amazon.com)

# Technical Info
AirPlay Protocol Spec:
https://nto.github.io/AirPlay.html

Good reference for other less well known daap commands
https://github.com/jkiddo/jolivia/blob/master/jolivia.dacp/src/main/java/org/dyndns/jkiddo/service/daap/client/RemoteControl.java

