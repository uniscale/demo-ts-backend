import { startAccountServer } from "./services/account"
import { startMessagesServer } from "./services/messages"
import { initializePlatformSession } from "./session-dispatcher"

const app = async () => {
  await initializePlatformSession()
  startAccountServer()
  startMessagesServer()
}

app()
