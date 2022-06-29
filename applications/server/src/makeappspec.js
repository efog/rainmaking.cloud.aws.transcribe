#! /usr/bin/env node
const data = require(`./${process.argv[2]}`);
const taskdefArn = process.argv[3];
data.Resources[0].TargetService.Properties.TaskDefinition = taskdefArn || "arn:aws:ecs:ca-central-1:032791158701:task-definition/StreamingServerStackstreamingServerapplicationTaskDefinitionFE38D0C2:38";
console.log(JSON.stringify(data));
