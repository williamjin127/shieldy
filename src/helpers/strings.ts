// Dependencies
import { Chat } from '../models'

export function strings(chat: Chat, key: string) {
  return (
    localizations[key][chat.language] ||
    `🤔 Localization not found, please, contact @borodutch.

Локализация не найдена, пожалуйста, напишите @borodutch.`
  )
}

const localizations = {
  help: {
    en: `Shieldy — is the best solution in Telegram to fight annoying spammers. It asks newcomers to execute a set action within a set period, otherwise it kicks them. It's this easy. Make sure @shieldy\\_bot is an admin at your chat and it's all done! You can also further setup the behaviour with the following commands:

/help — shows this message
/language — switches language
/captcha — changes type of captcha used
/timeLimit — changes amount of time given to newcomers
/lock — makes commands accessible only by admins

Still got questions? Contact my creator — @borodutch. Shieldy code is open source and can be found [here](https://github.com/backmeupplz/shieldy). Thank you!`,
    ru: `Shieldy — это лучшее решение в Телеграме по борьбе с надоедливыми спамерами. Он просит всех новичков сделать определенное действие в течение заданного времени и банит их, в случае несогласия. Да, это настолько просто. Убедитесь, что @shieldy\\_bot — админ в вашей группе, и все уже готово! Вы можете продолжить настройку бота, воспользовавшись следующими командами:

/help — показывает это сообщение
/language — меняет язык
/captcha — меняет тип капчи
/timeLimit — меняет количество времени, данное новичками
/lock — делает команды доступными только админами

Остались вопросы? Напишите моему создателю — @borodutch. Код Shieldy в открытом доступе [вот тут](https://github.com/backmeupplz/shieldy). Спасибо!`,
    it: `Shieldy — è la soluzione migliore in Telegram per combattere gli spammers. Chiede ai nuovi utenti di fare un azione entro un periodo prestabilito, sennò verranno kickati. E' semplice. Assicurati che @shieldy\\_bot è un amministratore del gruppo ed è tutto pronto! Puoi anche impostare le azioni dei seguenti comandi:

/help — Mostra questo messaggio
/language — Modifica la lingua
/captcha — Modifica il tipo di Captche
/timeLimit — Modifica il tempo per i nuovi membri
/lock — Rendi accessibili alcuni comandi solo agli amministratori

Still got questions? Contact my creator — @borodutch. Shieldy code is open source and can be found [here](https://github.com/backmeupplz/shieldy). Thank you!`,

  },
  language: {
    en: 'Please, select the language.',
    ru: 'Пожалуйста, выберите язык.',
    it: 'Prego, seleziona la lingua.',
  },
  language_selected: {
    en: 'Great, I speak English now.',
    ru: 'Отлично, я теперь говорю по-русски.',
    it: 'Perfetto, Ora parlo Italiano.',
  },
  only_author_can_reply: {
    en: 'Only the person who initiated the menu can select the choices.',
    ru: 'Только человек, вызвавший меню, может выбирать опции.',
    it: 'Solamente chi ha invocato il comando può selezionarlo.',
  },
  captcha: {
    en: `Please, select the test type for the newcomers:

• Simple — bot will ask to send anything to the chat
• Button — bot will ask to press a button`,
    ru: `Пожалуйста, выберите тип проверки новичков в чате:

• Простая — бот попросит прислать что угодно в чат
• Кнопкой — бот попросит нажать на кнопку.`,
    it: `Prego, seleziona uno dei seguenti test per i nuovi arrivati:

• Semplice — Il bot chiederà di inviare qualcunque messaggio in chat
• Bottone — Il bot chiederà di premere un pulsante`,
  },
  simple: {
    en: 'Simple',
    ru: 'Простая',
    it: 'Semplice',
  },
  digits: {
    en: 'Digits',
    ru: 'Цифровая',
    it: 'Digita',
  },
  button: {
    en: 'Button',
    ru: 'Кнопкой',
    it: 'Bottone',
  },
  captcha_selected: {
    en: 'Great, I will use this type of test then.',
    ru: 'Отлично, теперь я буду использовать этот тип теста.',
    it: 'Fantastico, Userò questo tipo di test.'
  },
  time_limit: {
    en:
      'Please, select how many seconds will newcomers get to complete the test before the kick.',
    ru:
      'Пожалуйста, выберите, сколько секунд будет у новичков, чтобы завершить тест перед киком.',
    it:
      'Prego, seleziona quanti secondi avrà il nuovo membro per completare il test prima di essere kickato',
  },
  time_limit_selected: {
    en: 'Great, I will use this time limit then.',
    ru: 'Отлично, теперь я буду использовать этот временной лимит.',
    it: 'Magnifico, Ora userò questo tempo',
  },
  seconds: {
    en: 'sec',
    ru: 'сек',
    it: 'sec',
  },
  lock_true: {
    en: 'Great! Now I will only react to commands sent by admins.',
    ru: 'Отлично! Теперь я буду принимать команды только от админов.',
    it: 'Perfetto, Ora eseguirò solamente i comandi inviati da amministratori.',
  },
  lock_false: {
    en: 'Great! Now I will react to commands sent by anybody.',
    ru: 'Отлично! Теперь я буду принимать команды ото всех.',
    it: 'Perfetto, Ora eseguirò i comandi inviati da tutti.',
  },
  simple_warning: {
    en:
      ', please, send any message to this group within the time amount specified, otherwise you will be kicked. Thank you!',
    ru:
      ', пожалуйста, отправьте любое сообщение в этот чат в течение указанного времени, иначе вы будете кикнуты. Спасибо!',
    it:
      ', prego, invia un messaggio in questo gruppo entro il tempo specificato, altrimenti verrai kickato. Grazie!',
  },
  digits_warning: {
    en:
      ', please, send the solution to the math equation provided within the time amount specified to this group, otherwise you will be kicked. Thank you!',
    ru:
      ', пожалуйста, отправьте решение указанного математического уравнения в этот чат в течение указанного времени, иначе вы будете кикнуты. Спасибо!',
    it:
      ', prego, invia la soluzione dell\'equazione matematica in questo gruppo entro il tempo specificato, altrimenti verrai kickato. Grazie!',
  },
  button_warning: {
    en:
      ', please, press the button below within the time amount specified, otherwise you will be kicked. Thank you!',
    ru:
      ', пожалуйста, нажмите на кнопку ниже в течение указанного времени, иначе вы будете кикнуты. Спасибо!',
    it:
      ', prego, clicca il bottone qui sotto entro il tempo prestabilito, altrimenti verrai kickato. Grazie!',
  },
  captcha_button: {
    en: 'I am not a bot',
    ru: 'Я не бот',
    it: 'Non sono un bot',
  },
  only_candidate_can_reply: {
    en: 'Only the candidate for not being a bot can press this button.',
    ru:
      'Только кандидат на то, чтобы быть человеком, может нажимать на эту кнопку.',
    it: 'Solamente il candidato che non è un bot può premere questo bottone.',
  },
}
