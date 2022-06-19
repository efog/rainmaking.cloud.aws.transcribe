#!/bin/bash
aws lambda update-function-code --function-name $1 --image-uri $2.dkr.ecr.$3.amazonaws.com/$4
STATE=$(aws lambda get-function --function-name $1 --query 'Configuration.[LastUpdateStatus]' | jq -r '.[0]')
echo "$STATE"
while [ $STATE == "InProgress" ]
do 
    STATE=$(aws lambda get-function --function-name $1 --query 'Configuration.[LastUpdateStatus]' | jq -r '.[0]') 
    echo "not ready... $STATE"
    sleep 3; 
done;
aws lambda publish-version --function-name $1 | jq