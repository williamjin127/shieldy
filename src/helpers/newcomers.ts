// Dependencies
import Telegraf, { ContextMessageUpdate, Extra } from 'telegraf'
import { strings } from './strings'
import {
  Candidate,
  findChatsWithCandidates,
  CaptchaType,
  Equation,
  removeMessages,
} from '../models'
import { bot } from './bot'
import { User } from 'telegram-typings'
import { report } from './report'
import { checkIfErrorDismissable } from './error'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'
import { generateEquation } from './equation'
import { checkCAS } from './cas'

export let globalyRestricted = []

export function setupNewcomers(bot: Telegraf<ContextMessageUpdate>) {
  // Add newcomers
  bot.on('new_chat_members', async ctx => {
    const candidatesToAdd = [] as Candidate[]
    const admins = (await ctx.getChatAdministrators()).map(u => u.user.id)
    try {
      if (ctx.chat.type === 'channel') {
        return
      }
      const chat = ctx.dbchat
      const candidates = chat.candidates
      for (const member of ctx.message.new_chat_members) {
        if (member.username === (bot as any).options.username) {
          try {
            await ctx.replyWithMarkdown(strings(chat, 'help'), {
              disable_web_page_preview: true,
            })
          } catch (err) {
            await report(bot, err, ctx)
          }
          continue
        }
        if (member.is_bot) {
          continue
        }
        // Don't ask people added by admins
        if (admins.includes(ctx.message.from.id)) {
          continue
        }
        globalyRestricted.push(member.id)
        removeMessages(ctx.chat.id, ctx.message.from.id) // don't await here
        // Check if CAS banned
        if (!(await checkCAS(member.id))) {
          globalyRestricted = globalyRestricted.filter(id => id !== member.id)
          try {
            await (bot.telegram as any).kickChatMember(
              chat.id,
              member.id,
              chat.banUsers
                ? 0
                : parseInt(`${new Date().getTime() / 1000 + 45}`)
            )
          } catch {
            // Do nothing
          }
          continue
        }
        // Send notifications about captcha and add to candidates
        if (candidates.map(c => c.id).indexOf(member.id) < 0) {
          const equation =
            chat.captchaType === CaptchaType.DIGITS
              ? generateEquation()
              : undefined
          let message
          try {
            message = await notifyCandidate(ctx, member, equation)
          } catch (err) {
            await report(bot, err, ctx)
          }
          candidatesToAdd.push({
            id: member.id,
            timestamp: new Date().getTime(),
            captchaType: chat.captchaType,
            messageId: message ? message.message_id : undefined,
            equation,
            entryChatId: ctx.chat.id,
            entryMessageId: ctx.message.message_id,
          })
        }
        // Restrict if requested
        if (chat.restrict) {
          console.log('🤜 Restricting as well')
          try {
            const gotUser = (await ctx.telegram.getChatMember(
              chat.id,
              member.id
            )) as any
            if (
              gotUser.can_send_messages &&
              gotUser.can_send_media_messages &&
              gotUser.can_send_other_messages &&
              gotUser.can_add_web_page_previews
            ) {
              const tomorrow =
                (new Date().getTime() + 24 * 60 * 60 * 1000) / 1000
              await (ctx.telegram as any).restrictChatMember(
                chat.id,
                member.id,
                {
                  until_date: tomorrow,
                  can_send_messages: true,
                  can_send_media_messages: false,
                  can_send_polls: false,
                  can_send_other_messages: false,
                  can_add_web_page_previews: false,
                  can_change_info: false,
                  can_invite_users: false,
                  can_pin_messages: false,
                }
              )
            }
          } catch (err) {
            await report(bot, err, ctx)
          }
        }
      }
      console.log(
        `➕ Adding candidates to ${ctx.chat.id}: ${candidatesToAdd.map(c =>
          c.id ? c.id : c
        )}`
      )
      chat.candidates = candidates.concat(candidatesToAdd)
      // Restrict if requested
      if (chat.restrict) {
        chat.restrictedUsers = chat.restrictedUsers.concat(candidatesToAdd)
      }
      console.log(
        `✅ Resulting candidates of ${ctx.chat.id}: ${chat.candidates.map(v =>
          v.id ? v.id : v
        )}`
      )
      await chat.save()
      // Delete entry message if required
      if (chat.deleteEntryMessages) {
        try {
          await ctx.telegram.deleteMessage(
            ctx.chat!.id,
            ctx.message!.message_id
          )
        } catch (err) {
          await report(bot, err, ctx)
        }
      }
    } finally {
      // Remove from globally restricted
      const ids = candidatesToAdd.map(c => c.id)
      globalyRestricted = globalyRestricted.filter(id => ids.indexOf(id) < 0)
    }
  })
  // Check left messages
  bot.on('left_chat_member', async ctx => {
    // Delete left message if required
    if (ctx.dbchat.deleteEntryMessages) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, ctx.message!.message_id)
      } catch (err) {
        await report(bot, err, ctx)
      }
    }
  })
  // Check newcomers
  bot.use(async (ctx, next) => {
    if (ctx.callbackQuery) {
      return next()
    }
    const chat = ctx.dbchat
    if (!chat.candidates.length) {
      return next()
    }
    const userId = ctx.from.id
    if (chat.candidates.map(c => c.id).indexOf(userId) < 0) {
      return next()
    }
    if (chat.captchaType === CaptchaType.BUTTON && chat.strict) {
      return ctx.deleteMessage()
    }
    const candidate = chat.candidates.filter(c => c.id === userId).pop()
    if (
      candidate.captchaType === CaptchaType.DIGITS &&
      (!ctx.message ||
        !ctx.message.text ||
        ctx.message.text.indexOf(candidate.equation.answer as string) < 0 ||
        (ctx.message.text.match(/\d/g) || []).length > 2)
    ) {
      if (chat.strict) {
        try {
          await ctx.deleteMessage()
        } catch (err) {
          await report(bot, err, ctx)
        }
        return
      }
      return next()
    } else if (candidate.captchaType === CaptchaType.DIGITS) {
      try {
        await ctx.deleteMessage()
      } catch (err) {
        await report(bot, err, ctx)
      }
    }
    console.log(`🔥 Removing ${userId} from candidates of ${ctx.chat.id}`)
    chat.candidates = chat.candidates.filter(c => c.id !== userId)
    try {
      ctx.dbchat = await chat.save()
    } catch (err) {
      await report(bot, err, ctx)
    }
    console.log(
      `✅ Resulting candidates of ${ctx.chat.id}: ${chat.candidates.map(v =>
        v.id ? v.id : v
      )}`
    )
    try {
      await ctx.telegram.deleteMessage(ctx.chat!.id, candidate.messageId)
    } catch (err) {
      await report(bot, err, ctx)
    }
    try {
      if (chat.greetsUsers && chat.greetingMessage) {
        const text = chat.greetingMessage.message.text
        let message
        if (text.includes('$username') || text.includes('$title')) {
          message = await ctx.telegram.sendMessage(
            chat.id,
            text
              .replace(/\$username/g, getUsername(ctx.from))
              .replace(/\$title/g, (await ctx.getChat()).title),
            Extra.webPreview(false) as ExtraReplyMessage
          )
        } else {
          message = await ctx.telegram.sendCopy(
            chat.id,
            chat.greetingMessage.message,
            Extra.webPreview(false) as ExtraReplyMessage
          )
        }
        if (chat.deleteGreetingTime && message) {
          setTimeout(async () => {
            try {
              await ctx.telegram.deleteMessage(
                message.chat.id,
                message.message_id
              )
            } catch (err) {
              // Do nothing
            }
          }, chat.deleteGreetingTime * 1000)
        }
      }
    } catch (err) {
      await report(bot, err, ctx)
    }
    next()
  })
  // Check button
  bot.action(/\d+~\d+/, async ctx => {
    console.log(
      `👻 Received callback query: ${ctx.chat.id}, ${ctx.callbackQuery.data}`
    )
    const params = ctx.callbackQuery.data.split('~')
    const userId = parseInt(params[1])
    const chat = ctx.dbchat
    if (userId !== ctx.from.id) {
      try {
        await ctx.answerCbQuery(strings(chat, 'only_candidate_can_reply'))
      } catch (err) {
        await report(bot, err, ctx)
      }
      return
    }
    if (chat.candidates.map(c => c.id).indexOf(userId) < 0) {
      return
    }
    console.log(`🔥 Removing ${userId} from candidates of ${ctx.chat.id}`)
    const candidate = chat.candidates.filter(c => c.id === userId).pop()
    chat.candidates = chat.candidates.filter(c => c.id !== userId)
    try {
      await chat.save()
    } catch (err) {
      await report(bot, err, ctx)
    }
    console.log(
      `✅ Resulting candidates of ${ctx.chat.id}: ${chat.candidates.map(v =>
        v.id ? v.id : v
      )}`
    )
    try {
      await ctx.telegram.deleteMessage(ctx.chat!.id, candidate.messageId)
    } catch (err) {
      await report(bot, err, ctx)
    }
    try {
      if (chat.greetsUsers && chat.greetingMessage) {
        const text = chat.greetingMessage.message.text
        let message
        if (text.includes('$username') || text.includes('$title')) {
          message = await ctx.telegram.sendMessage(
            chat.id,
            text
              .replace(/\$username/g, getUsername(ctx.from))
              .replace(/\$title/g, (await ctx.getChat()).title),
            Extra.webPreview(false) as ExtraReplyMessage
          )
        } else {
          const msg = chat.greetingMessage.message
          msg.text = `${msg.text}\n\n${getUsername(ctx.from)}`
          message = await ctx.telegram.sendCopy(
            chat.id,
            msg,
            Extra.webPreview(false) as ExtraReplyMessage
          )
        }
        if (chat.deleteGreetingTime && message) {
          setTimeout(async () => {
            try {
              await ctx.telegram.deleteMessage(
                message.chat.id,
                message.message_id
              )
            } catch (err) {
              // Do nothing
            }
          }, chat.deleteGreetingTime * 1000)
        }
      }
    } catch (err) {
      await report(bot, err, ctx)
    }
  })
}

async function notifyCandidate(
  ctx: ContextMessageUpdate,
  candidate: User,
  equation: Equation
) {
  const chat = ctx.dbchat
  const warningMessage = strings(chat, `${chat.captchaType}_warning`)
  console.log(`notifying in ${chat.id}`)
  const extra =
    chat.captchaType !== CaptchaType.BUTTON
      ? Extra.webPreview(false)
      : Extra.webPreview(false).markup(m =>
          m.inlineKeyboard([
            m.callbackButton(
              strings(chat, 'captcha_button'),
              `${chat.id}~${candidate.id}`
            ),
          ])
        )
  if (
    chat.customCaptchaMessage &&
    chat.captchaMessage &&
    (chat.captchaType !== CaptchaType.DIGITS ||
      chat.captchaMessage.message.text.includes('$equation'))
  ) {
    const text = chat.captchaMessage.message.text
    if (
      text.includes('$username') ||
      text.includes('$title') ||
      text.includes('$equation') ||
      text.includes('$seconds')
    ) {
      return ctx.telegram.sendMessage(
        chat.id,
        text
          .replace(/\$username/g, getUsername(ctx.from))
          .replace(/\$title/g, (await ctx.getChat()).title)
          .replace(/\$equation/g, equation ? (equation.question as string) : '')
          .replace(/\$seconds/g, `${chat.timeGiven}`),
        extra as ExtraReplyMessage
      )
    } else {
      const message = chat.captchaMessage.message
      message.text = `${message.text}\n\n${getUsername(ctx.from)}`
      return ctx.telegram.sendCopy(chat.id, message, extra as ExtraReplyMessage)
    }
  } else {
    return ctx.replyWithMarkdown(
      `${
        chat.captchaType === CaptchaType.DIGITS ? `(${equation.question}) ` : ''
      }[${getUsername(candidate)}](tg://user?id=${
        candidate.id
      })${warningMessage} (${chat.timeGiven} ${strings(chat, 'seconds')})`,
      extra
    )
  }
}

// Check if needs to ban
setInterval(async () => {
  if (!checking) {
    check()
  }
}, 15 * 1000)

let checking = false
async function check() {
  console.log('🤔 Checking candidates...')
  checking = true
  try {
    const chats = await findChatsWithCandidates()
    console.log(`🙌 Got ${chats.length} chats with candidates`)
    for (const chat of chats) {
      console.log(`🤖 Working on ${chat.id}`)
      const candidatesToDelete = []
      for (const candidate of chat.candidates) {
        const now = new Date().getTime()
        if (now - candidate.timestamp < chat.timeGiven * 1000) {
          console.log(
            `❌ Not kicking ${candidate.id} (${now -
              candidate.timestamp}/${chat.timeGiven * 1000})`
          )
          continue
        }
        try {
          console.log(`💀 Kicking ${candidate.id}`)
          candidatesToDelete.push(candidate)
          if (chat.deleteEntryOnKick) {
            try {
              await bot.telegram.deleteMessage(
                candidate.entryChatId,
                candidate.entryMessageId
              )
            } catch (err) {
              // do nothing
            }
          }
          // Can fail, it's ok
          await (bot.telegram as any).kickChatMember(
            chat.id,
            candidate.id,
            chat.banUsers ? 0 : parseInt(`${new Date().getTime() / 1000 + 45}`)
          )
        } catch (err) {
          if (checkIfErrorDismissable(err)) {
            candidatesToDelete.push(candidate)
          } else {
            await report(bot, err, undefined, 'kickChatMember')
          }
        }
        try {
          await bot.telegram.deleteMessage(chat.id, candidate.messageId)
        } catch (err) {
          await report(bot, err, undefined, 'deleteMessage')
        }
      }
      const idsToDelete = candidatesToDelete.map(c => c.id)
      if (idsToDelete.length) {
        console.log(`🔥 Removing ${idsToDelete}`)
        chat.candidates = chat.candidates.filter(
          c => idsToDelete.indexOf(c.id) < 0
        )
        console.log(`✅ Resulting ids: ${chat.candidates}`)
        await chat.save()
      }
      // Check restrictions
      const restrictedToDelete = []
      for (const candidate of chat.restrictedUsers) {
        if (new Date().getTime() - candidate.timestamp > 24 * 60 * 60 * 1000) {
          restrictedToDelete.push(candidate)
        }
      }
      const restrictedIdsToDelete = restrictedToDelete.map(c => c.id)
      if (restrictedIdsToDelete.length) {
        console.log(`🔥 Removing from restrictions ${restrictedIdsToDelete}`)
        chat.restrictedUsers = chat.restrictedUsers.filter(
          c => restrictedIdsToDelete.indexOf(c.id) < 0
        )
        console.log(`✅ Resulting restricted ids: ${chat.restrictedUsers}`)
        await chat.save()
      }
    }
  } catch (err) {
    report(bot, err, undefined, 'checking candidates')
  } finally {
    checking = false
  }
}

function getUsername(user: User) {
  return `${
    user.username
      ? `@${user.username}`
      : `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
  }`
}
