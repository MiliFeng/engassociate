const { BlazeClient } = require('mixin-node-sdk');
const config = require("./config");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: config.openai_key,
});

const openai = new OpenAIApi(configuration);

const client = new BlazeClient(
  {
    pin: config.pin,
    client_id: config.client_id,
    session_id: config.session_id,
    pin_token: config.pin_token,
    private_key: config.private_key,
  },
  { parse: true, syncAck: true }
);

client.loopBlaze({
  async onMessage(msg) {
    console.log(msg);
    if (msg.category === "ENCRYPTED_TEXT") {
      const rawData = msg.data.toString();

      const lang = checkLanguage(rawData);

      rawZhData = "";
      rawEnData = "";

      if (lang === "chinese") {
        console.log("chinese");
        rawZhData = rawData;
        rawEnData = await translate(lang, rawData);
      } else if (lang === "english") {
        console.log("english");
        rawEnData = rawData;
        rawZhData = await translate(lang, rawData);
      } else if (lang === "unknown") {
        console.log("unknown");
        client.sendMessageText(
          msg.user_id,
          `Only English and Chinese are suppored.'\n仅支持英文或中文.`
        );
      }
      // 处理收到的消息

      // 处理返回的消息
      const returnEnData = await conversation(rawEnData);
      const returnZhData = await translate("english", returnEnData);


      const rec = `> 用户:\n英文:${rawEnData}\n中文:${rawZhData}\n\n< 助手:\n英文:${returnEnData}\n中文:${returnZhData}\n`;
      await client.sendMessageText(msg.user_id, rec);
    } else {
      client.sendMessageText(msg.user_id, "Only supports text.\n仅支持文本。")
    }
  },
  onAckReceipt() { },
});


function checkLanguage(text) {
  // 判断第一个字符的编码范围来确定语言
  const firstCharCode = text.charCodeAt(0);
  if (firstCharCode >= 0x4E00 && firstCharCode <= 0x9FA5) {
    return 'chinese';
  } else if (firstCharCode >= 0x00 && firstCharCode <= 0x7F) {
    return 'english';
  } else {
    return 'unknown';
  }
}

async function translate(lang, text) {
  if (lang === "chinese") {
    // rec = "Hello" + text;
    msg = [
      {
        role: "system",
        content: "You are a helpful assistant that translates Chinese to English."
      },
      {
        role: "user",
        content: `Translate the following Chinese text to English: ${text}`,
      },
    ]
  } else if (lang === "english") {
    // rec = "你好" + text;
    msg = [
      {
        role: "system",
        content: "You are a helpful assistant that translates English to Chinese."
      },
      {
        role: "user",
        content: `Translate the following English to Chinese: ${text}`,
      },
    ]
  }

  const rec =  (await queryChatGpt(msg)).rec;
  return rec;
}

// client.sendMessageText()


async function conversation(text) {
  msg = [
    {
      role: "system",
      content: "I want you to act as a spoken English teacher and improver. I will speak to you in English and you will reply to me in English to practice my spoken English. I want you to keep your reply neat, limiting the reply to 100 words. I want you to strictly correct my grammar mistakes, typos, and factual errors. I want you to ask me a question in your reply. Now let's start practicing, you could ask me a question first. Remember, I want you to strictly correct my grammar mistakes, typos, and factual errors."
    },
    {
      role: "user",
      content: text,
    },
  ];
  const rec = (await queryChatGpt(msg)).rec;
  return rec;
}


async function queryChatGpt(msg) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: msg,
  });

  // console.log(completion)
  console.log(
    completion.data.choices[0].message.content.replace(/^"(.*)"$/, '$1')
  );
  console.log(completion.data.usage.total_tokens);
  const rec = completion.data.choices[0].message.content.replace(/^"(.*)"$/, '$1'
  );
  const token = completion.data.usage.total_tokens;
  return { rec: rec, token: token };
}

async function cost(params) {
  // "1000 $0.002"
  const cost = 0.002/1000*token
  return cost
}

