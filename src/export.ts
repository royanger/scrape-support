import {
  APIThreadChannel,
  APIMessage,
  APIChannel,
} from "discord-api-types/v10";
import log4js from "log4js";

log4js.configure({
  appenders: {
    exports: { type: "file", filename: "exports/exports.log" },
    skipped: { type: "file", filename: "exports/skipped.log" }
  },
  categories: {
    default: { appenders: ["exports"], level: "trace" },
    skipped: { appenders: ["skipped"], level: "debug" }

  },
});
const logger = log4js.getLogger("exports");
const skippedLogger = log4js.getLogger("skipped")

async function cooldown() {
  await new Promise((r) => setTimeout(r, 100));
}

const fetchThreads = async (before?: string) => {
  logger.debug('URL', `https://discord.com/api/v10/channels/${Bun.env.DISCORD_FORUM}/threads/archived/public${before !== undefined ? `?before=${before}` : ""}`)
  const res = await fetch(
    `https://discord.com/api/v10/channels/${Bun.env.DISCORD_FORUM}/threads/archived/public${before !== undefined ? `?before=${before}` : ""}`,
    {
      headers: {
        method: "GET",
        Authorization: `Bot ${Bun.env.DISCORD_TOKEN}`,
      },
    },
  );
  if (!res.ok) {
    logger.error(`Error fetching threads - ${res.statusText}`)
  }
  return (await res.json()) as {
    threads: APIThreadChannel[];
    first_messages: APIMessage[];
    has_more: boolean;
  };
};

const fetchMessages = async (threadId: string, beforeId?: string) => {
  let url = "";
  if (beforeId) {
    url = `https://discord.com/api/v10/channels/${threadId}/messages?before=${beforeId}&limit=100`;
  } else {
    url = `https://discord.com/api/v10/channels/${threadId}/messages?limit=100`;
  }

  const res = await fetch(url, {
    headers: {
      method: "GET",
      Authorization: `Bot ${Bun.env.DISCORD_TOKEN}`,
    },
  });
  if (!res.ok) {
    logger.error(`Error fetching messages - ${res.statusText}`)
  }
  return (await res.json()) as APIMessage[];
};

async function parseContentForChannel(content: string) {
  const channelCheck = content.match(/<#(.*)>/);
  if (channelCheck?.length && channelCheck?.length > 0) {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelCheck[1]}`,
      {
        headers: {
          method: "GET",
          Authorization: `Bot ${Bun.env.DISCORD_TOKEN}`,
        },
      },
    );
    if (!res.ok) {
      logger.error(`Error fetching channel - ${res.statusText}`)
    }

    const channel = (await res.json()) as APIChannel;

    return content.replace(
      /<#(.*?)>/g,
      `<span class="channel-name">#${channel.name}</span>`,
    );
  } else {
  }
  return content;
}

async function parseContentForLink(content: string) {
  return content.replace(/<http(.*?)>/g, "[http$1](http$1)");
}

let count = 0;
let block = 1;
let results = [];


const processThreads = async (before?: string) => {
  console.log(`Thread Block ${block}`);

  // clearing array for recursion
  results = [];

  // store the timestamp of the last thread processed, to used in following query
  let lastTimestamp = "";

  // Fetch a block of up to 50 threads
  const { threads, first_messages, has_more } = await fetchThreads(before);
  const length = threads.length

  // start for loop to run for each thread
  for (let i = 0; i < threads.length; i++) {

    // if the thread has no first message, skip it
    const firstMessage = first_messages.filter(
      (mes) => mes.channel_id === threads[i].id,
    );
    if (firstMessage.length > 0) {
      let messages: APIMessage[] = [];

      // fetch messages for a thread -- comes in up to 100 messages
      // need to check and fetch again if result === 100
      const fetchAllMessages = async (
        threadId: string,
        beforeId?: string,
      ) => {
        await cooldown();

        // Fetch up to 100 messages, use recursion to continue until all messages for thread fetched
        const res = await fetchMessages(threadId, beforeId);
        if (res.length === 100) {
          // length starts 1 on, but array starts at 0. This is the 100th message
          const beforeId = res[99].id;
          fetchAllMessages(threadId, beforeId);
        }

        messages = messages.concat(res);
        return messages;
      };

      // start fetching messages
      await fetchAllMessages(threads[i].id);
      await cooldown();

      // create arrays to fill with the data to export
      let messageResults = [];
      let userResults = [];

      for (let m = 0; m < messages.length; m++) {

        // fetch the message
        if (messages.length > 0) {
          let content = await parseContentForChannel(messages[m].content);

          if (messages[m].content) {

          } else if (!messages[m].content && messages[m].embeds.length > 0) {

            for (const embed of messages[m].embeds) {
              content += `## ${embed.title}\n${embed.description}`
              if (embed.fields) {
                for (const field of embed.fields) {
                  content += `\n\n### ${field.name}\n${field.value}`
                }
              }
            }
          }

          const messageObj = {
            id: messages[m].id,
            content: content,
            threadId: messages[m].channel_id,
            createdAt: messages[m].timestamp,
            updatedAt: messages[m].edited_timestamp ? messages[m].edited_timestamp : messages[m].timestamp,
            userId: messages[m].author.id,
            hasImages: false,
          };
          messageResults.push(messageObj);

          // fetch the user for the message, add to user array if not already present
          if (
            !userResults.some(
              (user) => user.userId === messages[m].author.id,
            )
          ) {
            const userObj = {
              userId: messages[m].author.id,
              discordUsername: messages[m].author.global_name
                ? messages[m].author.global_name
                : messages[m].author.username,

              discordAvatarId: messages[m].author.avatar,
            };
            userResults.push(userObj);
          }
        }
        await cooldown();
      }

      // get the first message, if there is one. Users will sometimes delete these
      const firstMessage = first_messages.filter(
        (mes) => mes.channel_id === threads[i].id,
      );
      if (firstMessage.length > 0) {
        const threadUser = {
          userId: threads[i].owner_id,
          discordUsername: firstMessage[0].author.username,
          discordAvatarId: firstMessage[0].author.avatar,
        };
        userResults.push(threadUser);
      }

      // get the threads details, attach messages and users to the object
      const res = {
        thread: {
          id: threads[i].id,
          title: threads[i].name,
          ownerId: threads[i].owner_id,
          createdAt: threads[i].thread_metadata?.create_timestamp,
          lastMessageId: threads[i].last_message_id,
          users: userResults,
          messages: messageResults,
          tags: threads[i].applied_tags,
        },
      };

      count++;

      // get the last time stamp, needed for thread fetching recursion
      lastTimestamp = threads[i].thread_metadata?.archive_timestamp
        .split("+")
        .shift()!;

      // simple, ugly status for export
      logger.debug(`${count} - ${threads[i].id}`, threads[i].name);

      results.push(res);
    } else {
      count++
      logger.info('SKIPPED:', `${count} - ${threads[i].id}`, threads[i].id, threads[i].name)
      skippedLogger.error(`${count} - ${threads[i].id}`, threads[i].id, threads[i].name)

    }
  }
  logger.debug("There is at least one more block of threads", has_more, lastTimestamp)
  if (has_more) {
    // if there are more threads, write a file with the current 'block' number in name
    const resultsFile = `./exports/results-${block}.json`;
    await Bun.write(resultsFile, JSON.stringify(results));
    block++;
    processThreads(lastTimestamp);
  } else {
    // when done, finish up
    const resultsFile = `./exports/results-${block}.json`;
    await Bun.write(resultsFile, JSON.stringify(results));
    console.log("Done");
  }
};

await processThreads();
