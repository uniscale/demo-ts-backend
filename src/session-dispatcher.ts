import { Platform, PlatformSession } from "@uniscale-sdk/ActorCharacter-Messagethreads"
import { getAccountInterceptors } from "./services/account"
import { getMessagesInterceptors } from "./services/messages"

export let platformSession: PlatformSession

export const initializePlatformSession = async () => {
  platformSession = await Platform.builder()
    .withInterceptors((builder) => {
      getAccountInterceptors(builder)
      getMessagesInterceptors(builder)
    })
    .build()
}
