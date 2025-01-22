import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { createHash } from "crypto";

export class TestStack2 extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
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
      createInternetGateway: true,
    });
    const vpcPub = new ec2.Vpc(this, "VpcPub", {
      availabilityZones: ["ap-northeast-1a"],
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const peering = new ec2.CfnVPCPeeringConnection(this, "Peering", {
      vpcId: vpcPrv.vpcId,
      peerVpcId: vpcPub.vpcId,
    });

    // private -> public route
    vpcPub.privateSubnets.map((subnet) => {
      new ec2.CfnRoute(this, `Route${generate8CharUid(subnet.subnetId)}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: vpcPub.vpcCidrBlock,
        vpcPeeringConnectionId: peering.ref,
      });
    });
    // public -> private route
    vpcPrv.publicSubnets.map((subnet) => {
      new ec2.CfnRoute(this, `Route${generate8CharUid(subnet.subnetId)}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: vpcPrv.vpcCidrBlock,
        vpcPeeringConnectionId: peering.ref,
      });
    });

    // ec2 instance

    // sg for private
    const sgPrv = new ec2.SecurityGroup(this, "SgPrv", {
      vpc: vpcPrv,
      allowAllOutbound: true,
    });
    sgPrv.addIngressRule(ec2.Peer.ipv4(vpcPrv.vpcCidrBlock), ec2.Port.tcp(22));

    // sg for bastion
    const sgPub = new ec2.SecurityGroup(this, "SgPub", {
      vpc: vpcPub,
      allowAllOutbound: true,
    });
    sgPub.addIngressRule(ec2.Peer.ipv4(vpcPub.vpcCidrBlock), ec2.Port.tcp(22));

    // key pair is automatically output in parameter store
    const keyPair = new ec2.KeyPair(this, "Key", {
      keyPairName: `bastion-key`,
    });

    const bastion = new ec2.Instance(this, `Bastion`, {
      instanceName: `bastion`,
      vpc: vpcPub,
      associatePublicIpAddress: true,
      keyPair: keyPair,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      propagateTagsToVolumeOnCreation: true,
      requireImdsv2: true,
      securityGroup: sgPub,
    });

    // vpc lambda
    const vpcLambda = new lambda.Function(this, "VpcLambda", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"),
      vpc: vpcPrv,
    });
  }
}

// ハッシュ値を生成する
function generate8CharUid(input: string): string {
  return createHash("sha256").update(input).digest("hex").substring(0, 8);
}
