import { APIThreadChannel, APIMessage } from "discord-api-types/v10";
import { env } from "process";

console.log("Hi Jacob!");

async function cooldown() {
  await new Promise((r) => setTimeout(r, 100));
}

const fetchThreads = async (before?: string) => {
  const res = await fetch(
    `https://discord.com/api/v10/channels/${Bun.env.DISCORD_SERVER}/threads/archived/public${before !== undefined ? `?before=${before}` : ""}`,
    {
      headers: {
        method: "GET",
        Authorization: `Bot ${Bun.env.DISCORD_TOKEN}`,
      },
    },
  );
  if (!res.ok) {
    console.log("error fetching threads:", res.statusText);
  }
  return (await res.json()) as {
    threads: APIThreadChannel[];
    first_messages: APIMessage[];
    has_more: boolean;
  };
};

const fetchMessages = async (threadId: string) => {
  const res = await fetch(
    `https://discord.com/api/v10/channels/${threadId}/messages`,
    {
      headers: {
        method: "GET",
        Authorization: `Bot ${Bun.env.DISCORD_TOKEN}`,
      },
    },
  );
  if (!res.ok) {
    console.log("error fetching messages:", res.statusText);
  }
  return (await res.json()) as APIMessage[];
};

let count = 0;
const processThreads = async (before?: string) => {
  let results = [];

  // get the timestamp of the last thread processed, to used in following query
  let lastTimestamp = "";

  const { threads, first_messages, has_more } = await fetchThreads(before);

  for (let i = 0; i < threads.length; i++) {
    const messages = await fetchMessages(threads[i].id);

    let messageResults = [];

    for (let m = 0; m < messages.length; m++) {
      let images = [];
      if (messages[m].attachments.length > 0) {
        for (let a = 0; a < messages[m].attachments.length; a++) {
          const imageObj = {
            id: messages[m].attachments[a].id,
            url: messages[m].attachments[a].url,
            width: messages[m].attachments[a].width,
            height: messages[m].attachments[a].height,
            filename: messages[m].attachments[a].filename,
          };
          images.push(imageObj);
          cooldown();
        }
      }

      let reactions = [];
      if (messages[m].reactions && messages[m]?.reactions?.length > 0) {
        for (let r = 0; r < messages[m]?.reactions?.length; r++) {
          const reactionObj = {
            name: messages[m]?.reactions[r]?.emoji.name,
            animated: messages[m]?.reactions[r]?.emoji.animated,
          };
          reactions.push(reactionObj);
          cooldown();
        }
      }

      if (messages.length > 0) {
        const messageObj = {
          id: messages[m].id,
          content: messages[m].content,
          threadId: messages[m].channel_id,
          createdAt: messages[m].timestamp,
          updatedAt: messages[m].edited_timestamp,
          discordId: messages[m].author.id,
          hasImages: images.length > 0 ? true : false,
          images,
          hasReactions: reactions.length > 0 ? true : false,
          reactions,
        };
        messageResults.push(messageObj);
      }
      cooldown();
    }

    const res = {
      thread: {
        id: threads[i].id,
        title: threads[i].name,
        discordId: threads[i].owner_id,
        createdAt: threads[i].thread_metadata?.create_timestamp,
        user: {
          discordId: threads[i].id,
          discordUsername:
            first_messages[i] && first_messages[i].author.username,
          discordAvatarId: first_messages[i] && first_messages[i].author.avatar,
        },
        messages: messageResults,
        tags: threads[i].applied_tags,
      },
    };
    count++;

    lastTimestamp = threads[i].thread_metadata?.archive_timestamp
      .split("+")
      .shift()!;
    console.log(threads[i].id, threads[i].name, count);

    results.push(res);
  }

  console.log("has more", has_more);
  if (has_more) {
    processThreads(lastTimestamp);
  } else {
    console.log(results);
  }
};

await processThreads();
