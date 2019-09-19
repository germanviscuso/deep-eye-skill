# Deep Eye: Connecting an Alexa Skill to a DeepLens via AWS SQS (Simple Queue Service)

## Prerequisites
* Amazon Developer Account (https://developer.amazon.com)
* AWS Account (recommended)
* ASK CLI (recommended)

## Dependencies
* Assumes code will run in AWS Lambda and the AWS SDK is automatically available. If run elsewhere, the AWS SDK must be included.
* Assumes you're runing the standard object detection model in your DeepLens
* Assumes you created an SQS queue called ObjectDetectionOutput as explained [here](https://aws.amazon.com/getting-started/tutorials/extend-deeplens-project) (for best results configure the queue with a 1 minute message retention period)
* Assumes both the Lambda and the SQS queue are in the same AWS account and region

## Setup
1. Use the ASK CLI to deploy the skill.
    > To deploy the skill without using the ASK CLI, follow the standard steps to setup a self-hosted skill (i.e. using your AWS account and not Alexa-hosted). Configure the Lambda function to use the IAM role created by the CloudFormation template (or grant permissions to the SQS Queue).
    > To use Alexa-hosted skills with this demo, cross-account access will be required. Follow [these instructions](https://developer.amazon.com/docs/hosted-skills/build-a-skill-end-to-end-using-an-alexa-hosted-skill.html) to adapt the demo and configure IAM security. This is an advanced configuration and not recommended for those new to AWS and IAM.
2. Go to [AWS Lambda](https://console.aws.amazon.com/lambda), locate the Lambda function created by the skill, locate the IAM role and click on the link to edit it. Add the following policy so your lambda can access the SQS queue:

- PolicyName: sqs-access
- PolicyDocument:
- Version: 2012-10-17
- Statement:
- Effect: Allow
- Action:
- sqs:DeleteMessage
- sqs:GetQueueAttributes
- sqs:GetQueueUrl
- sqs:ReceiveMessage
- sqs:SendMessage

(or you might want to use a predefined SQS Full acess policy (at your own risk!))

## Running the Demo

To run the demo, simply launch the skill, "Alexa, open deep eye".  This will read the SQS queue and create a proper response based on ojects seen by DeepLens.
If you want to "see" the environment again just ask "what can you see?"

To view the queue, locate the queue in the [Amazon SQS console](https://console.aws.amazon.com/sqs).

## Resources

[Amazon SQS Developer Guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)

[Amazon SQS API Reference](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/)
