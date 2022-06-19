#! /usr/bin/env node
const path = require("path");

const data = require(`./${process.argv[2]}`);
const funcName = process.argv[3];
const funcAlias = process.argv[4];
const currentVersion = process.argv[5];
const targetVersion = process.argv[6];

const func = {};
func[funcName] = {
    Type: "AWS::Lambda::Function",
    Properties: {
        Name: funcName,
        Alias: funcAlias,
        CurrentVersion: currentVersion,
        TargetVersion: targetVersion
    }
};
data.Resources.push(func);
console.log(JSON.stringify(data));
