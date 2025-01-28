import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { createHash } from "crypto";

export class TestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // const yourIp = this.node.tryGetContext("your_ip");
    // ec2
    const vpcPrv = new ec2.Vpc(this, "Vpc", {
      availabilityZones: ["ap-northeast-1a"],
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      cidr: "10.0.0.0/16",
      createInternetGateway: true,
    });
    // sg for private
    const sgPrv = new ec2.SecurityGroup(this, "SgPrv", {
      vpc: vpcPrv,
      allowAllOutbound: true,
    });
    sgPrv.addIngressRule(ec2.Peer.ipv4(vpcPrv.vpcCidrBlock), ec2.Port.tcp(22));

    // vpc lambda
    const vpcLambda = new lambda.Function(this, "VpcLambda", {
      functionName: "vpc-lambda",
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lib/lambda"),
      vpc: vpcPrv,
    });
  }
}

// ハッシュ値を生成する
function generate8CharUid(input: string): string {
  return createHash("sha256").update(input).digest("hex").substring(0, 8);
}
