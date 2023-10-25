# Demo solution TypeScript backend

## How to run

Get npm registry credentials for `@uniscale-sdk/ActorCharacter-Messagethreads` from `Demo company`'s solution in Uniscale and paste those to `.npmrc`.

`npm install`
`npm run start`

This will instantiate two services; messages and account running in their own servers.

## How to use

Send backend action request to `/api/service-to-module/:featureId`. Port 5298 for account service and port 5192 for messages.
