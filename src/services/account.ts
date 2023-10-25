import { BackendAction, PlatformInterceptorBuilder, Result } from "@uniscale-sdk/ActorCharacter-Messagethreads"
import { generateUUID } from "@uniscale-sdk/ActorCharacter-Messagethreads/models/uuid"
import { UserFull } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Account/Account"
import { LookupUsers } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Account_1_0/Functionality/ServiceToModule/Account/GetUsers/QuickLookup"
import { SearchAllUsers } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Account_1_0/Functionality/ServiceToModule/Account/GetUsers/SearchUsersByHandle"
import { GetOrRegister } from "@uniscale-sdk/ActorCharacter-Messagethreads/sdk/UniscaleDemo/Account_1_0/Functionality/ServiceToModule/Account/Registration/ContinueToApplication"
import express from 'express'
import cors from 'cors'
import { platformSession } from "../session-dispatcher"

// Create in memory cache of users
const users: UserFull[] = []

export const getAccountInterceptors = (builder: PlatformInterceptorBuilder) => {
  builder
    .interceptRequest(
      GetOrRegister.allFeatureUsages,
      GetOrRegister.handle((input, _ctx) => {
        // Get the existing user if there is a match on user handle
        const existingUser = users.find(u => u.handle === input)

        if (existingUser) return  Result.ok(existingUser)

        // Create a new user and return it
        const newUserIdentifier = generateUUID()
        const user = new UserFull()
        user.userIdentifier = newUserIdentifier
        user.handle = input

        users.push(user)

        return Result.ok(user)
      })
    )
    .interceptRequest(
      LookupUsers.allFeatureUsages,
      LookupUsers.handle((input, _ctx) => {
        const response = users
          .filter(u => (input || []).includes(u.userIdentifier || ''))

        return Result.ok(response)
      })
    )
    .interceptRequest(
      SearchAllUsers.allFeatureUsages,
      SearchAllUsers.handle((input, _ctx) => {
        return Result.ok(users.filter(u => u.handle?.toLowerCase().includes(input.toLowerCase())))
      })
    )
}

export const startAccountServer = () => {
  const port = 5298
  const app = express()

  app.use(express.json())
  app.use(cors())

  app.all('/api/service-to-module/:featureId', async (req, res) => {
    const request = req.body as BackendAction<unknown, unknown>

    try {
      const value = await platformSession.acceptGatewayRequest(JSON.stringify(request))
      res.status(200).send(value)
    } catch (error) {
      console.error(error)
      res.status(500).send(error)
    }
  })

  app.listen(port, () => {
    console.log(`Account service listening on port ${port}`)
  })
}
