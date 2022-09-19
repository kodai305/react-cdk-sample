#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipelineStack';

const app = new cdk.App();

new PipelineStack(app, `ReactSampleAppPipelineStack`, {
  env: { 
    account: '',
    region: 'ap-northeast-1' 
  },
  stagingDeployConfig: {
    env: {
      region: 'ap-northeast-1',
      account: ''
    },
    stackName: 'react-sample-app-stg-stack',
    appConfig: {
      baseDomainName: '',
      hostedZoneId: '',
      domainName: '',
      appEnv: 'stg',
    },
  },
  productionDeployConfig: {
    env: {
      region: 'ap-northeast-1',
      account: ''
    },
    stackName: 'react-sample-app-prd-stack',
    appConfig: {
      baseDomainName: '',
      hostedZoneId: '',
      domainName: '',
      appEnv: 'prd',
    },
  }  
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
