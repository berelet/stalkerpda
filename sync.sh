#!/bin/bash

# Environment variables
DB_PASSWORD="4c78768f1a2191ef978adafa18d4de87"
JWT_SECRET="9bff4221ac9f0a5158524b4dd4bfb1899755856f86bd7f25e8a7c0b3b7673c6b"

# Run SAM sync with watch mode
sam sync --template infrastructure/template.yaml \
  --stack-name pda-zone-dev \
  --watch \
  --profile stalker \
  --region eu-north-1 \
  --parameter-overrides Environment=dev DBUsername=pda_admin DBPassword=$DB_PASSWORD JWTSecret=$JWT_SECRET AllowedIP=0.0.0.0/0
