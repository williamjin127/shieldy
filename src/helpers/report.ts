// Dependencies
import Telegraf, { ContextMessageUpdate } from 'telegraf'
import { checkIfErrorDismissable } from './error'

export async function report(
  bot: Telegraf<ContextMessageUpdate>,
  error: Error
) {
  if (checkIfErrorDismissable(error)) {
    return
  }
  const adminChatId = process.env.ADMIN
  if (!adminChatId) return
  try {
    await bot.telegram.sendMessage(
      adminChatId,
      `\`\`\`${error.message}\`\`\``,
      {
        parse_mode: 'Markdown',
      } as any
    )
  } catch (err) {
    console.error(err)
  }
}
