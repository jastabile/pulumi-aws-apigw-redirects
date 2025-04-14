# Redirect API

A serverless API Gateway solution built with Pulumi to handle URL redirections based on rules defined in a CSV file.

## Overview

This project creates an AWS API Gateway that manages HTTP redirects (301) based on configured rules. It uses Pulumi for infrastructure as code and supports nested path structures.

Before deploying, you need to configure a custom domain in the AWS API Gateway console. This involves:
1. Creating a custom domain name in API Gateway
2. Configuring SSL certificate (if using HTTPS)
3. Creating DNS records to point to the API Gateway domain

Pulumi will automatically create an API mapping that connects your API Gateway to the custom domain. The mapping is configured in the `index.js` file and should use the domain name you've set up in the AWS console.

## Prerequisites

- AWS CLI configured
- S3 Bucket to store pulumi state
- Custom domain configured in AWS API Gateway

```bash
aws s3 mb s3://jastabile-bucket-pulumi-states --region us-east-2
```

- Node.js 18+
- Pulumi CLI installed

## Project Structure

- `index.js` - Main Pulumi configuration file
- `rules.csv` - CSV file containing redirect rules
- `Pulumi.yaml` - Pulumi project configuration

## CSV Rules Format

The `rules.csv` file should contain the following columns:

- `source_path` - The original path that should be redirected
- `destination_url` - The target URL where the request should be redirected to

## Usage

```bash
npm install
pulumi preview
pulumi up
```

## Check redirects 
You can verify the redirects in two ways:

1. Manual browser check:
   Visit `gateway.mydomain.com/example-path/<source_path>` and verify you are redirected to the expected destination URL.

2. Automated check using Python script:
   ```bash
   cd check_redirects
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```
   The script will check all redirect rules defined in rules.csv and report any mismatches or errors.


## Clean
```bash
pulumi destroy
aws s3 rm s3://jastabile-bucket-pulumi-states --recursive
aws s3 rb s3://jastabile-bucket-pulumi-states
```