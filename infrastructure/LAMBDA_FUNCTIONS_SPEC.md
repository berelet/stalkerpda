# Lambda Functions Update for template.yaml

## Auth Functions - CORRECT
LoginFunction:
  Handler: src.handlers.auth.login_handler
  Events:
    Login:
      Path: /api/auth/login
      Method: POST

RegisterFunction:
  Handler: src.handlers.auth.register_handler
  Events:
    Register:
      Path: /api/auth/register
      Method: POST

MeFunction:
  Handler: src.handlers.auth.me_handler
  Events:
    GetMe:
      Path: /api/auth/me
      Method: GET

## Location Functions
LocationUpdateFunction:
  Handler: src.handlers.location.update_handler
  Events:
    UpdateLocation:
      Path: /api/location
      Method: POST

## Artifacts Functions
ArtifactsListFunction:
  Handler: src.handlers.artifacts.handler
  Events:
    GetArtifacts:
      Path: /api/artifacts
      Method: GET

ArtifactsExtractFunction:
  Handler: src.handlers.artifacts.extract_handler
  Events:
    ExtractArtifact:
      Path: /api/artifacts/{id}/extract
      Method: POST

ArtifactsCompleteFunction:
  Handler: src.handlers.artifacts.complete_handler
  Events:
    CompleteExtraction:
      Path: /api/artifacts/{id}/complete
      Method: POST

ArtifactsCancelFunction:
  Handler: src.handlers.artifacts.cancel_handler
  Events:
    CancelExtraction:
      Path: /api/artifacts/{id}/cancel
      Method: POST

ArtifactsDropFunction:
  Handler: src.handlers.artifacts.drop_handler
  Events:
    DropArtifact:
      Path: /api/artifacts/{id}/drop
      Method: POST

## Players Functions
PlayersListFunction:
  Handler: src.handlers.players.handler
  Events:
    GetPlayers:
      Path: /api/players
      Method: GET

PlayerDeathFunction:
  Handler: src.handlers.players.death_handler
  Events:
    MarkDeath:
      Path: /api/player/death
      Method: POST

PlayerLootFunction:
  Handler: src.handlers.players.loot_handler
  Events:
    LootPlayer:
      Path: /api/player/loot
      Method: POST

## Contracts Functions
ContractsListFunction:
  Handler: src.handlers.contracts.handler
  Events:
    GetContracts:
      Path: /api/contracts
      Method: GET

ContractsMyFunction:
  Handler: src.handlers.contracts.my_contracts_handler
  Events:
    GetMyContracts:
      Path: /api/contracts/my
      Method: GET

ContractsCreateFunction:
  Handler: src.handlers.contracts.create_handler
  Events:
    CreateContract:
      Path: /api/contracts
      Method: POST

ContractsAcceptFunction:
  Handler: src.handlers.contracts.accept_handler
  Events:
    AcceptContract:
      Path: /api/contracts/{id}/accept
      Method: POST

ContractsCompleteFunction:
  Handler: src.handlers.contracts.complete_handler
  Events:
    CompleteContract:
      Path: /api/contracts/{id}/complete
      Method: POST

ContractsConfirmFunction:
  Handler: src.handlers.contracts.confirm_handler
  Events:
    ConfirmContract:
      Path: /api/contracts/{id}/confirm
      Method: POST

## Zones Functions
ZonesListFunction:
  Handler: src.handlers.zones.handler
  Events:
    GetZones:
      Path: /api/zones
      Method: GET

ZonesCaptureFunction:
  Handler: src.handlers.zones.capture_handler
  Events:
    CaptureZone:
      Path: /api/zones/control/{id}/capture
      Method: POST

ZonesCompleteFunction:
  Handler: src.handlers.zones.complete_capture_handler
  Events:
    CompleteCapture:
      Path: /api/zones/control/{id}/complete
      Method: POST

ZonesCancelFunction:
  Handler: src.handlers.zones.cancel_capture_handler
  Events:
    CancelCapture:
      Path: /api/zones/control/{id}/cancel
      Method: POST

## Admin Functions
AdminPlayersFunction:
  Handler: src.handlers.admin.handler
  Events:
    GetAllPlayers:
      Path: /api/admin/players
      Method: GET

AdminHistoryFunction:
  Handler: src.handlers.admin.history_handler
  Events:
    GetPlayerHistory:
      Path: /api/admin/players/{id}/history
      Method: GET

AdminSpawnArtifactFunction:
  Handler: src.handlers.admin.spawn_artifact_handler
  Events:
    SpawnArtifact:
      Path: /api/admin/artifacts/spawn
      Method: POST

AdminCreateRadiationZoneFunction:
  Handler: src.handlers.admin.create_radiation_zone_handler
  Events:
    CreateRadiationZone:
      Path: /api/admin/zones/radiation
      Method: POST

AdminCreateControlPointFunction:
  Handler: src.handlers.admin.create_control_point_handler
  Events:
    CreateControlPoint:
      Path: /api/admin/zones/control
      Method: POST

## WebSocket Functions
WebSocketConnectFunction:
  Handler: src.handlers.websocket.connect_handler

WebSocketDisconnectFunction:
  Handler: src.handlers.websocket.disconnect_handler

WebSocketMessageFunction:
  Handler: src.handlers.websocket.message_handler
