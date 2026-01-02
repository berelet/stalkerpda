# Промпт для создания AWS инфраструктуры PDA ZONE (Free Tier)

## Контекст

Ты — DevOps инженер с экспертизой в AWS. Создай инфраструктуру для serverless приложения, которая:
- Полностью укладывается в AWS Free Tier (первые 12 месяцев)
- Деплоится из командной строки через AWS CLI и SAM CLI
- Не требует CI/CD пайплайнов
- Работает в регионе eu-central-1 (Frankfurt)
- **RDS MySQL публично доступен** для подключения с локальной машины разработчика

## Целевая архитектура

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                      CloudFront                              │
│  - Origin 1: S3 (React SPA)                                 │
│  - Origin 2: API Gateway (REST API)                         │
│  - Origin 3: API Gateway (WebSocket)                        │
└─────────────────────────────────────────────────────────────┘
    │                    │                    │
    ▼                    ▼                    ▼
┌─────────┐      ┌──────────────┐     ┌──────────────┐
│ S3      │      │ API Gateway  │     │ API Gateway  │
│ Bucket  │      │ REST API     │     │ WebSocket    │
│ (React) │      │ /api/*       │     │ /ws          │
└─────────┘      └──────┬───────┘     └──────┬───────┘
                        │                     │
                        ▼                     ▼
                 ┌─────────────────────────────────┐
                 │         Lambda Functions         │
                 │  - auth (login, register)        │
                 │  - players (CRUD + location)     │
                 │  - artifacts (scan, extract)     │
                 │  - contracts (CRUD, escrow)      │
                 │  - zones (control, status)       │
                 │  - location (GPS tracking)       │
                 │  - websocket (connect/message)   │
                 │  - admin (game master + map)     │
                 └─────────────┬───────────────────┘
                               │
                               ▼
                 ┌─────────────────────────────────┐
                 │  RDS MySQL 8.0 (db.t3.micro)    │
                 │  - 20GB storage                  │
                 │  - PUBLIC ACCESS (dev)           │
                 │  - Single-AZ (Free Tier)        │
                 └─────────────────────────────────┘
```

## Геопозиционирование

### Механика
1. **Клиент (игрок)** отправляет свои GPS координаты каждые 10-30 секунд
2. **Сервер** сохраняет последнюю позицию + историю (для треков)
3. **Game Master** видит всех игроков на карте в реальном времени
4. **Зоны** определяются полигонами — сервер проверяет, в какой зоне игрок

### Структура данных для геолокации

```sql
-- Позиции игроков (последняя известная)
CREATE TABLE player_locations (
    player_id VARCHAR(36) PRIMARY KEY,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy FLOAT,                    -- точность GPS в метрах
    altitude FLOAT,                    -- высота (опционально)
    heading FLOAT,                     -- направление движения
    speed FLOAT,                       -- скорость м/с
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- История перемещений (для треков GM)
CREATE TABLE location_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(36) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_player_time (player_id, recorded_at),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Зоны как полигоны (GeoJSON)
CREATE TABLE zones (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('anomaly', 'control', 'neutral', 'safe') NOT NULL,
    danger_level INT DEFAULT 0,
    owner_faction VARCHAR(50),
    boundary JSON NOT NULL,            -- GeoJSON Polygon
    center_lat DECIMAL(10, 8),         -- центр для быстрого поиска
    center_lng DECIMAL(11, 8),
    radius_meters INT,                 -- приблизительный радиус
    modifiers JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints для геолокации

```
POST /api/location              -- Игрок отправляет свои координаты
GET  /api/location/me           -- Получить свою последнюю позицию
GET  /api/admin/locations       -- GM: все игроки на карте (real-time)
GET  /api/admin/locations/{id}/history?from=&to=  -- GM: трек игрока
GET  /api/zones/current         -- В какой зоне сейчас игрок
POST /api/admin/zones           -- GM: создать/изменить зону
```

### WebSocket события для карты GM

```json
// Сервер → GM: обновление позиции игрока
{
  "action": "player_location_update",
  "data": {
    "playerId": "uuid",
    "nickname": "Stalker_01",
    "faction": "stalker",
    "status": "alive",
    "position": {
      "lat": 34.7071,
      "lng": 33.0226,
      "accuracy": 5,
      "heading": 45,
      "speed": 1.2
    },
    "currentZone": "zone_alpha",
    "timestamp": "2024-01-15T14:30:00Z"
  }
}

// Сервер → GM: игрок вошёл/вышел из зоны
{
  "action": "zone_transition",
  "data": {
    "playerId": "uuid",
    "fromZone": "neutral_1",
    "toZone": "anomaly_3",
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

## AWS Free Tier лимиты (контролируй!)

| Сервис | Free Tier лимит | Наш расход |
|--------|-----------------|------------|
| Lambda | 1M requests/month, 400K GB-seconds | ~100K requests |
| API Gateway | 1M REST calls/month | ~100K calls |
| S3 | 5GB storage, 20K GET, 2K PUT | ~100MB, ~10K GET |
| CloudFront | 1TB transfer, 10M requests | ~10GB, ~100K req |
| RDS MySQL | 750 hrs db.t3.micro, 20GB | 24/7 = 720 hrs ✓ |
| CloudWatch | 5GB logs, 10 metrics | ~1GB logs |

### Расчёт нагрузки на геолокацию

```
30 игроков × 1 запрос/30сек × 3600сек/час × 8 часов игры = 28,800 запросов/игра
При 4 играх в месяц = ~115,000 запросов → укладываемся в Free Tier
```

## Задание 1: Создай AWS SAM template.yaml

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: PDA ZONE - S.T.A.L.K.E.R. Airsoft Game Platform (MySQL + Geolocation)

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, prod]
  
  DBUsername:
    Type: String
    Default: pda_admin
    NoEcho: true
  
  DBPassword:
    Type: String
    NoEcho: true
    MinLength: 8
  
  JWTSecret:
    Type: String
    NoEcho: true
    MinLength: 32
  
  AllowedIP:
    Type: String
    Description: Your IP for RDS access (e.g., 1.2.3.4/32)
    Default: 0.0.0.0/0  # ⚠️ Change in prod!

Globals:
  Function:
    Runtime: python3.11
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        ENVIRONMENT: !Ref Environment
        DB_HOST: !GetAtt MySQLDB.Endpoint.Address
        DB_PORT: !GetAtt MySQLDB.Endpoint.Port
        DB_NAME: pda_zone
        DB_USER: !Ref DBUsername
        DB_PASSWORD: !Ref DBPassword
        JWT_SECRET: !Ref JWTSecret
        CONNECTIONS_TABLE: !Ref ConnectionsTable
        WEBSOCKET_API_ENDPOINT: !Sub "https://${WebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}"

Resources:
  # ============================================
  # RDS MySQL (Public Access for Development)
  # ============================================
  
  DBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for RDS MySQL - Public Access
      SecurityGroupIngress:
        # Lambda access (any, since Lambda не в VPC)
        - IpProtocol: tcp
          FromPort: 3306
          ToPort: 3306
          CidrIp: 0.0.0.0/0
        # Your IP for local development
        - IpProtocol: tcp
          FromPort: 3306
          ToPort: 3306
          CidrIp: !Ref AllowedIP
      Tags:
        - Key: Name
          Value: !Sub pda-zone-rds-sg-${Environment}

  MySQLDB:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub pda-zone-db-${Environment}
      DBInstanceClass: db.t3.micro  # Free Tier!
      Engine: mysql
      EngineVersion: '8.0'
      DBName: pda_zone
      MasterUsername: !Ref DBUsername
      MasterUserPassword: !Ref DBPassword
      AllocatedStorage: 20  # Free Tier limit
      StorageType: gp2
      VPCSecurityGroups:
        - !GetAtt DBSecurityGroup.GroupId
      PubliclyAccessible: true  # ✅ Доступ с локальной машины
      BackupRetentionPeriod: 7
      DeletionProtection: false
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # ============================================
  # S3 Bucket (Frontend)
  # ============================================
  FrontendBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub pda-zone-frontend-${Environment}-${AWS::AccountId}
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      CorsConfiguration:
        CorsRules:
          - AllowedHeaders: ['*']
            AllowedMethods: [GET, HEAD]
            AllowedOrigins: ['*']
            MaxAge: 3600

  FrontendBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref FrontendBucket
      PolicyDocument:
        Statement:
          - Action: s3:GetObject
            Effect: Allow
            Resource: !Sub ${FrontendBucket.Arn}/*
            Principal:
              Service: cloudfront.amazonaws.com
            Condition:
              StringEquals:
                AWS:SourceArn: !Sub arn:aws:cloudfront::${AWS::AccountId}:distribution/${CloudFrontDistribution}

  # ============================================
  # CloudFront Distribution
  # ============================================
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        PriceClass: PriceClass_100
        
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt FrontendBucket.RegionalDomainName
            S3OriginConfig:
              OriginAccessIdentity: ''
            OriginAccessControlId: !Ref CloudFrontOAC
          
          - Id: APIOrigin
            DomainName: !Sub ${RestApi}.execute-api.${AWS::Region}.amazonaws.com
            CustomOriginConfig:
              HTTPSPort: 443
              OriginProtocolPolicy: https-only

        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          Compress: true

        CacheBehaviors:
          - PathPattern: /api/*
            TargetOriginId: APIOrigin
            ViewerProtocolPolicy: https-only
            CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
            OriginRequestPolicyId: b689b0a8-53d0-40ab-baf2-68738e2966ac
            AllowedMethods: [GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE]

        CustomErrorResponses:
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html

  CloudFrontOAC:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name: !Sub pda-zone-oac-${Environment}
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  # ============================================
  # API Gateway (REST)
  # ============================================
  RestApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub pda-zone-api-${Environment}
      StageName: !Ref Environment
      Cors:
        AllowMethods: "'*'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'*'"

  # ============================================
  # Lambda Functions - Auth
  # ============================================
  LoginFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-login-${Environment}
      Handler: src.handlers.auth.login_handler
      CodeUri: backend/
      Events:
        Login:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/auth/login
            Method: POST

  RegisterFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-register-${Environment}
      Handler: src.handlers.auth.register_handler
      CodeUri: backend/
      Events:
        Register:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/auth/register
            Method: POST

  # ============================================
  # Lambda Functions - Players
  # ============================================
  PlayersFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-players-${Environment}
      Handler: src.handlers.players.handler
      CodeUri: backend/
      Events:
        GetPlayers:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/players
            Method: GET
        GetPlayer:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/players/{id}
            Method: GET
        UpdatePlayer:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/players/{id}
            Method: PUT

  # ============================================
  # Lambda Functions - Location (GPS Tracking)
  # ============================================
  LocationUpdateFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-location-update-${Environment}
      Handler: src.handlers.location.update_handler
      CodeUri: backend/
      Events:
        UpdateLocation:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/location
            Method: POST
        GetMyLocation:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/location/me
            Method: GET
        GetCurrentZone:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/zones/current
            Method: GET

  # ============================================
  # Lambda Functions - Artifacts
  # ============================================
  ArtifactsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-artifacts-${Environment}
      Handler: src.handlers.artifacts.handler
      CodeUri: backend/
      Events:
        ScanArtifacts:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/artifacts/scan
            Method: POST
        ExtractArtifact:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/artifacts/{id}/extract
            Method: POST
        GetArtifacts:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/artifacts
            Method: GET

  # ============================================
  # Lambda Functions - Contracts
  # ============================================
  ContractsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-contracts-${Environment}
      Handler: src.handlers.contracts.handler
      CodeUri: backend/
      Events:
        GetContracts:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/contracts
            Method: GET
        CreateContract:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/contracts
            Method: POST
        AcceptContract:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/contracts/{id}/accept
            Method: POST

  # ============================================
  # Lambda Functions - Zones
  # ============================================
  ZonesFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-zones-${Environment}
      Handler: src.handlers.zones.handler
      CodeUri: backend/
      Events:
        GetZones:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/zones
            Method: GET
        ControlZone:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/zones/{id}/control
            Method: POST

  # ============================================
  # Lambda Functions - Admin (Game Master)
  # ============================================
  AdminFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-admin-${Environment}
      Handler: src.handlers.admin.handler
      CodeUri: backend/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable
        - Statement:
            - Effect: Allow
              Action:
                - execute-api:ManageConnections
              Resource: !Sub "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*"
      Events:
        # GM: Все игроки на карте
        GetAllLocations:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/admin/locations
            Method: GET
        # GM: История перемещений игрока
        GetLocationHistory:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/admin/locations/{id}/history
            Method: GET
        # GM: Управление зонами
        CreateZone:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/admin/zones
            Method: POST
        UpdateZone:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/admin/zones/{id}
            Method: PUT
        # GM: События и управление игрой
        GameEvents:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/admin/events
            Method: GET
        SpawnArtifact:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/admin/artifacts/spawn
            Method: POST
        ResetGame:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/admin/reset
            Method: POST
        # GM: Broadcast сообщение всем
        BroadcastMessage:
          Type: Api
          Properties:
            RestApiId: !Ref RestApi
            Path: /api/admin/broadcast
            Method: POST

  # ============================================
  # WebSocket API (Real-time updates)
  # ============================================
  WebSocketApi:
    Type: AWS::ApiGatewayV2::Api
    Properties:
      Name: !Sub pda-zone-websocket-${Environment}
      ProtocolType: WEBSOCKET
      RouteSelectionExpression: $request.body.action

  WebSocketStage:
    Type: AWS::ApiGatewayV2::Stage
    Properties:
      ApiId: !Ref WebSocketApi
      StageName: !Ref Environment
      AutoDeploy: true

  # WebSocket Routes
  ConnectRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref WebSocketApi
      RouteKey: $connect
      AuthorizationType: NONE
      Target: !Sub integrations/${ConnectIntegration}

  DisconnectRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref WebSocketApi
      RouteKey: $disconnect
      AuthorizationType: NONE
      Target: !Sub integrations/${DisconnectIntegration}

  DefaultRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref WebSocketApi
      RouteKey: $default
      AuthorizationType: NONE
      Target: !Sub integrations/${DefaultIntegration}

  # WebSocket Integrations
  ConnectIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref WebSocketApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${WebSocketConnectFunction.Arn}/invocations

  DisconnectIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref WebSocketApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${WebSocketDisconnectFunction.Arn}/invocations

  DefaultIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref WebSocketApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${WebSocketMessageFunction.Arn}/invocations

  # WebSocket Lambda Functions
  WebSocketConnectFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-ws-connect-${Environment}
      Handler: src.handlers.websocket.connect_handler
      CodeUri: backend/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable

  WebSocketDisconnectFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-ws-disconnect-${Environment}
      Handler: src.handlers.websocket.disconnect_handler
      CodeUri: backend/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable

  WebSocketMessageFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-ws-message-${Environment}
      Handler: src.handlers.websocket.message_handler
      CodeUri: backend/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable
        - Statement:
            - Effect: Allow
              Action:
                - execute-api:ManageConnections
              Resource: !Sub "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*"

  # Lambda Permissions for WebSocket
  WebSocketConnectPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref WebSocketConnectFunction
      Principal: apigateway.amazonaws.com

  WebSocketDisconnectPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref WebSocketDisconnectFunction
      Principal: apigateway.amazonaws.com

  WebSocketMessagePermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref WebSocketMessageFunction
      Principal: apigateway.amazonaws.com

  # ============================================
  # DynamoDB (WebSocket Connections)
  # ============================================
  ConnectionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub pda-zone-connections-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: connectionId
          AttributeType: S
        - AttributeName: playerId
          AttributeType: S
      KeySchema:
        - AttributeName: connectionId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: playerIdIndex
          KeySchema:
            - AttributeName: playerId
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true

# ============================================
# Outputs
# ============================================
Outputs:
  CloudFrontURL:
    Description: CloudFront Distribution URL
    Value: !Sub https://${CloudFrontDistribution.DomainName}

  ApiURL:
    Description: API Gateway URL
    Value: !Sub https://${RestApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}

  WebSocketURL:
    Description: WebSocket API URL
    Value: !Sub wss://${WebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}

  S3BucketName:
    Description: S3 Bucket for Frontend
    Value: !Ref FrontendBucket

  RDSEndpoint:
    Description: RDS MySQL Endpoint (Public)
    Value: !GetAtt MySQLDB.Endpoint.Address
  
  RDSPort:
    Description: RDS MySQL Port
    Value: !GetAtt MySQLDB.Endpoint.Port

  ConnectionString:
    Description: MySQL Connection String (without password)
    Value: !Sub "mysql://${DBUsername}:****@${MySQLDB.Endpoint.Address}:${MySQLDB.Endpoint.Port}/pda_zone"
```

## Задание 2: Создай скрипты для деплоя

### infrastructure/scripts/deploy.sh

```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-eu-central-1}
STACK_NAME="pda-zone-${ENVIRONMENT}"

echo "🚀 Deploying PDA ZONE to ${ENVIRONMENT}..."

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "AWS CLI required"; exit 1; }
command -v sam >/dev/null 2>&1 || { echo "SAM CLI required"; exit 1; }

# Get your public IP for RDS access
MY_IP=$(curl -s https://checkip.amazonaws.com)/32
echo "📍 Your IP: ${MY_IP}"

# Build backend
echo "📦 Building backend..."
cd backend
pip install -r requirements.txt -t .
cd ..

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Deploy SAM stack
echo "☁️ Deploying SAM stack..."
sam deploy \
  --template-file infrastructure/template.yaml \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    DBUsername=${DB_USERNAME:-pda_admin} \
    DBPassword=${DB_PASSWORD} \
    JWTSecret=${JWT_SECRET} \
    AllowedIP=${MY_IP} \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

# Get outputs
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
  --output text)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" \
  --output text)

RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text)

API_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query "Stacks[0].Outputs[?OutputKey=='ApiURL'].OutputValue" \
  --output text)

WS_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketURL'].OutputValue" \
  --output text)

# Upload frontend to S3
echo "📤 Uploading frontend to S3..."
aws s3 sync frontend/dist s3://${S3_BUCKET} --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Origins.Items[].DomainName, '${S3_BUCKET}')].Id" \
  --output text)

if [ -n "$DISTRIBUTION_ID" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*"
fi

echo ""
echo "✅ Deployment complete!"
echo "========================================"
echo "🌐 Frontend URL:  ${CLOUDFRONT_URL}"
echo "🔌 API URL:       ${API_URL}"
echo "📡 WebSocket URL: ${WS_URL}"
echo "🗄️  MySQL Host:    ${RDS_ENDPOINT}"
echo "========================================"
echo ""
echo "Connect to MySQL:"
echo "  mysql -h ${RDS_ENDPOINT} -u pda_admin -p pda_zone"
```

### infrastructure/scripts/setup-local.sh

```bash
#!/bin/bash
# Локальный MySQL для разработки

docker run -d \
  --name pda-zone-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_USER=pda_admin \
  -e MYSQL_PASSWORD=localdev123 \
  -e MYSQL_DATABASE=pda_zone \
  -p 3306:3306 \
  mysql:8.0

echo "⏳ Waiting for MySQL..."
sleep 15

# Run migrations
cd backend
alembic upgrade head

echo "✅ Local MySQL ready!"
echo "Connection: mysql -h localhost -u pda_admin -plocaldev123 pda_zone"
```

### infrastructure/scripts/run-migrations.sh

```bash
#!/bin/bash
# Запуск миграций на RDS

ENVIRONMENT=${1:-dev}
STACK_NAME="pda-zone-${ENVIRONMENT}"

# Get RDS endpoint from CloudFormation
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text)

echo "🗄️ Running migrations on ${RDS_ENDPOINT}..."

# Set environment for Alembic
export DB_HOST=${RDS_ENDPOINT}
export DB_PORT=3306
export DB_NAME=pda_zone
export DB_USER=${DB_USERNAME:-pda_admin}
export DB_PASSWORD=${DB_PASSWORD}

cd backend
alembic upgrade head

echo "✅ Migrations complete!"
```

## Задание 3: Создай Makefile

```makefile
.PHONY: help install dev build deploy deploy-frontend deploy-backend migrate

ENVIRONMENT ?= dev
REGION ?= eu-central-1

help:
	@echo "PDA ZONE - Available commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start local development"
	@echo "  make build        - Build frontend and backend"
	@echo "  make deploy       - Deploy everything to AWS"
	@echo "  make deploy-fe    - Deploy frontend only"
	@echo "  make deploy-be    - Deploy backend only"
	@echo "  make migrate      - Run database migrations"
	@echo "  make logs         - Tail Lambda logs"

install:
	cd frontend && npm ci
	cd backend && pip install -r requirements.txt

dev-db:
	docker-compose up -d postgres

dev-backend:
	cd backend && uvicorn src.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

build:
	cd frontend && npm run build
	cd backend && pip install -r requirements.txt -t ./package

deploy:
	./infrastructure/scripts/deploy.sh $(ENVIRONMENT)

deploy-fe:
	./infrastructure/scripts/deploy-frontend.sh $(ENVIRONMENT)

deploy-be:
	sam deploy --config-env $(ENVIRONMENT)

migrate:
	cd backend && alembic upgrade head

logs:
	sam logs --stack-name pda-zone-$(ENVIRONMENT) --tail
```

## Free Tier чеклист

После деплоя проверь в AWS Console → Billing → Free Tier:

- [ ] Lambda: < 1M requests
- [ ] API Gateway: < 1M calls  
- [ ] S3: < 5GB storage
- [ ] CloudFront: < 1TB transfer
- [ ] RDS: db.t3.micro, < 20GB storage
- [ ] DynamoDB: < 25GB, < 25 WCU/RCU

## ⚠️ Важные замечания

1. **NAT Gateway НЕ входит в Free Tier** (~$32/month). Используем VPC Endpoints.

2. **RDS в private subnet** требует:
   - Lambda в том же VPC
   - Или RDS Proxy (не Free Tier)
   - Или bastion host для миграций

3. **Elastic IP**: Если выделишь и не привяжешь — платно!

4. **CloudWatch Logs**: Настрой retention (7 дней) чтобы не превысить 5GB.

## Начни с этих команд

```bash
# 1. Установи AWS CLI и SAM CLI
brew install awscli aws-sam-cli  # macOS
# или
pip install awscli aws-sam-cli   # Linux/Windows

# 2. Настрой credentials
aws configure

# 3. Создай секреты
export DB_PASSWORD="YourSecurePassword123!"
export JWT_SECRET="YourSuperSecretJWTKey32chars!!"

# 4. Деплой
make deploy ENVIRONMENT=dev
```
