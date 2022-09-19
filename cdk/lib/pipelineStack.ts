// import * as chatbot from '@aws-cdk/aws-chatbot';
import * as cdk from 'aws-cdk-lib';
import { AppConfig } from "./frontendStack";
import { CodePipeline, ShellStep, CodePipelineSource, ManualApprovalStep } from "aws-cdk-lib/pipelines";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as notifications from 'aws-cdk-lib/aws-codestarnotifications';
import * as sns from 'aws-cdk-lib/aws-sns';
import { AppStage } from "./appStage";
import { Construct } from 'constructs';


const app = new cdk.App();

export type AppDeployConfig  = {
  env: {
    account: string;
    region: string;
  },
  stackName?: string;
  appConfig: AppConfig
}

export interface PipelineStackProps extends cdk.StackProps {
  stagingDeployConfig: AppDeployConfig,
  productionDeployConfig: AppDeployConfig
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);
    if (!props) {
      throw new Error('props required');
    }
    
    const repositoryName = '';
    /**
     * XXX: Code Commit でなくGithubと連携させる場合にはGithub用の実装に変える必要がある
     */
    const repository = codecommit.Repository.fromRepositoryName(
      this, 'Repository', repositoryName
    );

    // リリース完了処理でリポジトリにリリース課題の ID をタグとして設定したいので
    // そのためのポリシーを作る。
    //
    // 1. CodePipeline から承認アクションのコメント（リリース課題の ID を承認時に開発者が設定）
    //    を取ることができるようにパイプラインの実行ログとアクションログの参照権限をあたえるためのもの
    const policyStatementToReadApprovalComment = new PolicyStatement();
    policyStatementToReadApprovalComment.addActions(
      'codepipeline:ListPipelineExecutions',
      'codepipeline:ListActionExecutions',
    );
    policyStatementToReadApprovalComment.addResources('*');
    policyStatementToReadApprovalComment.effect = Effect.ALLOW;

    // 2. CodeCommit 上のリポジトリにタグ付けするためのもの
    const policyStatementToTagRepository = new PolicyStatement();
    policyStatementToTagRepository.addActions(
      'codecommit:GitPull',
      'codecommit:GitPush',
    );
    policyStatementToTagRepository.addResources(repository.repositoryArn);
    policyStatementToTagRepository.effect = Effect.ALLOW;    

    const pipelineName = 'SampleReactAppPipeline';
    const pipeline = new CodePipeline(this, 'SampleReactAppPipeline', {
      pipelineName,
      crossAccountKeys: true,
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.codeCommit(
          repository,
          'master',
          {
            codeBuildCloneOutput: true
          }
        ),
        commands: [
          "cd infra && yarn install && cd ../apps",
          // "yarn lint",
          "npm install",
          "npm test -- --watchAll=false",
          "npm run lint",
          "npm run build",
          "cd ../cdk",
          "npm ci",
          "npm run build",
          "npx cdk synth -v",
        ],
        primaryOutputDirectory: 'cdk/cdk.out',
      }),
      codeBuildDefaults: {
        rolePolicy: [
          policyStatementToReadApprovalComment,
          policyStatementToTagRepository,
        ],        
      }
    });

    // Deploy to Staging
    const staging = new AppStage(
      app, 'Staging', props.stagingDeployConfig
    );
    pipeline.addStage(staging);
    /*
    // Smoke Test (UAT)
    stagingStage.stackSteps addAction(new ShellStep("StgDeploy", {
      actionName: 'SmokeTest',
      useOutputs: {
        STAGING_APP_URL: pipeline.stackOutput(staging.appUrlOutput),
      },
      commands: [
        'curl -Ssf $STAGING_APP_URL',
      ],
    }));
    */

    // Deploy to Production
    const production = new AppStage(
      app, 'Production', props.productionDeployConfig
    );
    const productionStage = pipeline.addStage(production, {
      post: [
        new cdk.pipelines.ShellStep('Tag Script', {
          commands: [`REPO_NAME=${repositoryName} PIPELINE_NAME=${pipelineName} ./scripts/tag_repository.sh`]
        }),
      ]
    });
    productionStage.addPre(new ManualApprovalStep('ReleaseApproval'));

    // slack への通知設定
    const topic = new sns.Topic(this, 'MyTopic1');
    const slack = new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
      // 事前に作成
      slackChannelConfigurationName: '',
      slackWorkspaceId: '',
      // 送付先の public チャネルを指定。private でも可能だが `@aws` をチャネルに `\invite` する必要あり。
      slackChannelId: '',
    });
    pipeline.buildPipeline();
    const rule = new notifications.NotificationRule(this, 'NotificationRule', {
      source: pipeline.pipeline,
      events: [
        'codepipeline-pipeline-pipeline-execution-failed',
        'codepipeline-pipeline-pipeline-execution-canceled',
        'codepipeline-pipeline-pipeline-execution-started',
        'codepipeline-pipeline-pipeline-execution-resumed',
        'codepipeline-pipeline-pipeline-execution-succeeded',
        'codepipeline-pipeline-manual-approval-needed'
      ],
      targets: [topic],
    });
    rule.addTarget(slack);   
  }
}