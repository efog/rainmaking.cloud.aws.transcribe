#!/bin/bash
UPDATE=$(aws lambda update-function-code --function-name $1 --image-uri $2.dkr.ecr.$3.amazonaws.com/$4 | jq)
STATE=$(aws lambda get-function --function-name $1 --query 'Configuration.[LastUpdateStatus]' | jq -r '.[0]')
while [ $STATE == "InProgress" ]
do 
    STATE=$(aws lambda get-function --function-name $1 --query 'Configuration.[LastUpdateStatus]' | jq -r '.[0]') 
    sleep 3; 
done;
echo $(aws lambda publish-version --function-name $1 | jq -r ".Version")