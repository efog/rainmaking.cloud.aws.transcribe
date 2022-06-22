#! /usr/bin/env node
const data = require(`./${process.argv[2]}`);
const taskdefArn = process.argv[3];
data.Resources[0].TargetService.Properties.TaskDefinition = taskdefArn;
console.log(JSON.stringify(data));
