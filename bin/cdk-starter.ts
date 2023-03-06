import * as cdk from 'aws-cdk-lib';
import {CurveAnalyticsStack} from '../lib/curve-analytics-stack';

const app = new cdk.App();
new CurveAnalyticsStack(app, 'curve-analytics-stack', {
  stackName: 'curve-analytics-stack',
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});