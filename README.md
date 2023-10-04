# Pseudorandom AWS Lambda

## Overview
This AWS Lambda function is the worker for an Amazon SQS Queue
it grabs data from the queue that was sent from Pseudorandom sources 
and creates records in Supabase
it also uses this data to create Replicate requests, and waits for reponses
when a response is recieved, this function updates the records in Supabase

## Prerequisites
- AWS Account
- AWS CLI (optional)
- Node.js and NPM
- Supabase Account and a configured database

## Deployment

1. Zip the contents of this project

zip -r my-lambda-package.zip
 or
use the built-in 'Send to > Compressed (zipped) folder' option, or use a tool like 7-Zip.

2. upload this Zip to the appropriate Lambda function


