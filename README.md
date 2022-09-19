## 概要

 - ReactアプリをCDK(v2)でデプロイするためのサンプル
 - CDKでデプロイするリソース構成
    - アプリ: S3 + CloudFront + ACM + Route53
    - CI/CD: Codepipeline等

## ディレクトリ構成

 - cdk
    - cdk関連のリソース
 - react-sample-app
    - reactプロジェクト

## 備考

 - AWSAccountやRoute53のゾーンID、Chatbot用のConfig等は環境に合わせたものを用意し、設定する必要がある
 - cdk bootstrap, cdk bootstrap (--trust)等を各AWSアカウントに対して実行する必要がある