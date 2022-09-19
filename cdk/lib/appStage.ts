import { Stage, StageProps } from "aws-cdk-lib";
import { AppConfig, CdkFrontStack } from "./frontendStack";
import { Construct } from 'constructs';
// const app = new cdk.App();

export interface AppStageProps extends StageProps {
  appConfig: AppConfig
}

export class AppStage extends Stage {
  // public readonly appUrlOutput: CfnOutput;
  
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);
    new CdkFrontStack(this, `react-frontend-${props.appConfig.appEnv}-stack`, props);
    // this.appUrlOutput = app.appUrlOutput;
  }
}
