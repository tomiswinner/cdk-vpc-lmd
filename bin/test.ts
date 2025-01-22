#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { TestStack3 } from "../lib/test-stack";
const app = new cdk.App();
// new TestStack(app, "TestStack", {});
// new TestStack2(app, "TestStack2", {});
new TestStack3(app, "TestStack3", {});
