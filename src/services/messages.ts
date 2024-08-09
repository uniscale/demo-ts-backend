import { BackendAction, PlatformInterceptorBuilder, Result } from "@uniscale-sdk/ActorCharacter-Messagethreads"
import { generateUUID } from "@uniscale-sdk/ActorCharacter-Messagethreads/models/uuid"
import {
    DirectMessageFull,
    MessageFull
} from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages/Messages"
import { ErrorCodes } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0"
import { GetMessageList } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0/Functionality/ServiceToModule/Messages/Timeline/ListMessages"
import { SendMessage } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0/Functionality/ServiceToModule/Messages/Timeline/SendMessage"
import { platformSession } from "../session-dispatcher"
import cors from "cors"
import express from "express"


import {
    GetDirectMessageList
} from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0/Functionality/ServiceToModule/Messages/DirectMessages/ListDirectMessages";
import {
    ReplyToDirectMessage
} from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0/Functionality/ServiceToModule/Messages/DirectMessages/ReplyingToADirectMessage";
import {
    SendDirectMessage
} from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Messages_1_0/Functionality/ServiceToModule/Messages/DirectMessages/SendingANewDirectMessage";

const messages = new Map<string, MessageFull>()
const directMessages = new Map<string, DirectMessageFull>()

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
      .interceptRequest(GetDirectMessageList.allFeatureUsages, GetDirectMessageList.handle((userIdentifier, _ctx) => {
        const result = Array.from(directMessages)
            .filter(m => m[1].receiver === userIdentifier)
          .map(m => m[1])
          .filter((_m, i) => i < 50)
          .sort((a, b) => (b.created?.at?.getTime() || 0) - (a.created?.at?.getTime() || 0))

        return Result.ok(result)
      }))
      .interceptMessage(ReplyToDirectMessage.allFeatureUsages, ReplyToDirectMessage.handle((input, _ctx) => {
          if (!input?.message || input.message.length < 3 || input.message.length > 60) {
              return Result.badRequest(ErrorCodes.messages.invalidMessageLength)
          }

          if(input.directMessageIdentifier === undefined) {
                return Result.badRequest(ErrorCodes.messages.validationError)
          }

          const directMessage = directMessages.get(input.directMessageIdentifier)

          if(directMessage === undefined) {
              return Result.badRequest(ErrorCodes.messages.validationError)
          }

          if(directMessage.replies === undefined){
             directMessage.replies = []
          }

          let newNumber = Math.max(...directMessage.replies.map(r => r.number || 0), 0) + 1

          directMessage.replies.push({
              number: newNumber,
              message: input.message,
              created: {
                  by: input.by,
                  at: new Date()
              }
          })



        return Result.ok(undefined)
      }))
      .interceptMessage(SendDirectMessage.allFeatureUsages, SendDirectMessage.handle((input, ctx) => {
            if (!input?.message || input.message.length < 3 || input.message.length > 60) {
                return Result.badRequest(ErrorCodes.messages.invalidMessageLength)
            }

            const directMessage = new DirectMessageFull()
            directMessage.directMessageIdentifier = generateUUID()
            directMessage.message = input.message
            directMessage.created = {
                by: input.by,
                at: new Date()
            }
            directMessage.receiver = input.receiver
            directMessage.replies = []

            directMessages.set(directMessage.directMessageIdentifier, directMessage)

            return Result.ok(undefined)
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
