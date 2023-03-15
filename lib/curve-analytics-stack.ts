import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';

import { aws_events as events, Duration } from "aws-cdk-lib"
import { aws_events_targets as event_targets } from "aws-cdk-lib"

import * as dotenv from "dotenv";

dotenv.config();

export class CurveAnalyticsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambda.Function(this, 'Curve analytics', {
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'index.main',
      code: lambda.Code.fromAsset('scripts/curve-analytics'),
      environment: {
        MAINNET_URL: process.env.MAINNET_URL as string
      },
    });

    const eventRule = new events.Rule(this, "Curve analytics cron", {
        schedule: events.Schedule.rate(Duration.hours(1)),
    })
    eventRule.addTarget(new event_targets.LambdaFunction(lambdaFunction));
  }
}