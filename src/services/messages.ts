import { BackendAction, PlatformInterceptorBuilder, Result } from "@uniscale-sdk/ActorCharacter-Messagethreads"
import { generateUUID } from "@uniscale-sdk/ActorCharacter-Messagethreads/models/uuid"
import { MessageFull } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages/Messages"
import { ErrorCodes } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0"
import { GetMessageList } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0/Functionality/ServiceToModule/Messages/Timeline/ListMessages"
import { SendMessage } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0/Functionality/ServiceToModule/Messages/Timeline/SendMessage"
import express from 'express'
import cors from 'cors'
import { platformSession } from "../session-dispatcher"

const messages = new Map<string, MessageFull>()

export const getMessagesInterceptors = (builder: PlatformInterceptorBuilder) => {
  builder
    // Register an interceptor for the message feature SendMessage
    .interceptMessage(
      // Specify the allFeatureUsages pattern so that the implementation
      // picks up features for all use case instances this feature
      // is used in
      SendMessage.allFeatureUsages,
      // Define a handler for the feature
      SendMessage.handle((input, _ctx) => {
        if (!input?.message || input.message.length < 3 || input.message.length > 60) {
          return Result.badRequest(ErrorCodes.messages.invalidMessageLength)
        }

        const message = new MessageFull()
        message.messageIdentifier = generateUUID()
        message.message = input.message
        message.created = {
          by: input.by,
          at: new Date()
        }

        messages.set(message.messageIdentifier, message)

        return Result.ok(undefined)
      }))
    // Register an interceptor for the request/response feature GetMessageList
    .interceptRequest(
      GetMessageList.allFeatureUsages,
      GetMessageList.handle((_input, _ctx) => {
        // return 50 messages as an array in descending order

        const result = Array.from(messages)
          .map(m => m[1])
          .filter((_m, i) => i < 50)
          .sort((a, b) => (b.created?.at?.getTime() || 0) - (a.created?.at?.getTime() || 0))

        return Result.ok(result)
      }))
}

export const startMessagesServer = () => {
  const port = 5192
  const app = express()

  app.use(express.json())
  app.use(cors())

  app.all('/api/service-to-module/:featureId', async (req, res) => {
    const request = req.body as BackendAction<unknown, unknown>

    try {
      const value = await platformSession.acceptGatewayRequest(JSON.stringify(request))
      res.status(200).send(value)
    } catch (error) {
      console.log(error)
      res.status(500).send(error)
    }
  })

  app.listen(port, () => {
    console.log(`Messages service listening on port ${port}`)
  })
}
