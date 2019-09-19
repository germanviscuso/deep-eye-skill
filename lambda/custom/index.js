//@ts-check
const Alexa = require('ask-sdk');
const CookbookSQS = require('./cookbook-sqs.js');
const i18n = require('i18next');
const languageStrings = require('./localisation');

const queueName = 'ObjectDetectionOutput';
const queueRegion = process.env.AWS_REGION; // defaults to region the lambda function is running in

// Intent Handlers =============================================

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return EyeIntentHandler.handle(handlerInput);
  },
};

const EyeIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && 
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'EyeIntent'
      || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.MoreIntent'
      || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent'
      || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.RepeatIntent');
  },
  async handle(handlerInput) {
    const responseBuilder = handlerInput.responseBuilder;
    let speechOutput = '';

    const queue = new CookbookSQS.SQSQueue(queueName, queueRegion);
    // check queue size
    const attributes = await queue.getQueueAttributes(['ApproximateNumberOfMessages']);
    //if (attributes.ApproximateNumberOfMessages) {
      //speechOutput += handlerInput.t('NUMBER_OF_MESSAGES', {count: attributes.ApproximateNumberOfMessages});
    //}

    const messages = await queue.retrieveMessage(10, 60);
    //console.log(JSON.stringify(messages));
    const shortTermMemory = new Map();
    for(let message of messages){
      //console.log(message.Body);
      const snapshot = JSON.parse(message.Body);
      if(Object.keys(snapshot).length === 0 && snapshot.constructor === Object)
        continue; //empty snapshot  
      const seenObjects = Object.keys(snapshot);
      //console.log(seenObjects);
      for(let seenObject of seenObjects){
        if(shortTermMemory.has(seenObject)){
          const properties = shortTermMemory.get(seenObject);
          properties['timesSeen'] += 1;
          properties['probablilitySum'] += snapshot[seenObject];
          properties['probabilityAvg'] = properties['probablilitySum'] / properties['timesSeen'];
          shortTermMemory.set(seenObject, properties);
        } else {
          shortTermMemory.set(seenObject, {'timesSeen': 1, 'probablilitySum': snapshot[seenObject], 'probabilityAvg': snapshot[seenObject]});
        }
      }
    }

    let higherProb = [], highProb = [], lowProb = [], lowerProb = [];

    for (const [k, v] of shortTermMemory) {
      console.log(k, v);
      const probability = v.probabilityAvg;
      if(probability >= 0.75)
        higherProb.push(k);
      else
      if(probability > 0.5)
        highProb.push(k);
      else
      if(probability >= 0.3)
        lowProb.push(k);
      else
      if(probability > 0)
        lowerProb.push(k);
    }

    if(higherProb.length > 0){
      speechOutput += handlerInput.t('HIGHER_PROBABILITY_MSG');
      higherProb.forEach((object, index) => {
        speechOutput += handlerInput.t('ARTICLE_MSG', {object: object});
        if (index === Object.keys(higherProb).length - 2)
            speechOutput += handlerInput.t('CONJUNCTION_MSG');
        else
            speechOutput += ', ';
      });
    }

    if(highProb.length > 0){
      speechOutput += handlerInput.t('HIGH_PROBABILITY_MSG');
      highProb.forEach((object, index) => {
        speechOutput += handlerInput.t('ARTICLE_MSG', {object: object});
        if (index === Object.keys(highProb).length - 2)
            speechOutput += handlerInput.t('CONJUNCTION_MSG');
        else
            speechOutput += ', ';
      });
    }

    if(lowProb.length > 0){
      speechOutput += handlerInput.t('LOW_PROBABILITY_MSG');
      lowProb.forEach((object, index) => {
        speechOutput += handlerInput.t('ARTICLE_MSG', {object: object});
        if (index === Object.keys(lowProb).length - 2)
            speechOutput += handlerInput.t('CONJUNCTION_MSG');
        else
            speechOutput += ', ';
      });
    }

    if(lowerProb.length > 0){
      speechOutput += handlerInput.t('LOWER_PROBABILITY_MSG');
      lowerProb.forEach((object, index) => {
        speechOutput += handlerInput.t('ARTICLE_MSG', {object: object});
        if (index === Object.keys(lowerProb).length - 2)
            speechOutput += handlerInput.t('CONJUNCTION_MSG');
        else
            speechOutput += ', ';
      });
    }

    return responseBuilder
      .speak(speechOutput)
      .reprompt(speechOutput)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' && 
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const responseBuilder = handlerInput.responseBuilder;
    return responseBuilder
      .speak(handlerInput.t('HELP_MSG'))
      .getResponse();
  },
};

const CancelStopHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' || 
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const responseBuilder = handlerInput.responseBuilder;

    return responseBuilder
      .speak(handlerInput.t('GOODBYE_MSG'))
      .getResponse();
  },
};

const SessionEndedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.stack}`);

    return handlerInput.responseBuilder
      .speak(handlerInput.t('ERROR_MSG'))
      .getResponse();
  },
};

// This request interceptor will bind a translation function 't' to the handlerInput
// Additionally it will handle picking a random value if instead of a string it receives an array
const LocalisationRequestInterceptor = {
  process(handlerInput) {
      const localisationClient = i18n.init({
          lng: Alexa.getLocale(handlerInput.requestEnvelope),
          resources: languageStrings,
          returnObjects: true
      });
      localisationClient.localise = function localise() {
          const args = arguments;
          const value = i18n.t(...args);
          if (Array.isArray(value)) {
              return value[Math.floor(Math.random() * value.length)];
          }
          return value;
      };
      handlerInput.t = function translate(...args) {
          return localisationClient.localise(...args);
      }
  }
};

// Exports handler function and setup ===================================================
const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    EyeIntentHandler,
    CancelStopHandler,
    HelpHandler,
    SessionEndedHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LocalisationRequestInterceptor)
  .withCustomUserAgent('cookbook/deepeye/v1')
  .lambda();
