import { APIThreadChannel, APIMessage } from "discord-api-types/v10";
import { PrismaClient } from "@prisma/client";
import { createWithSlugFn } from "prisma-extension-create-with-slug";

console.log("Hi Jacob!");

const prisma = new PrismaClient().$extends(createWithSlugFn());

async function cooldown() {
  await new Promise((r) => setTimeout(r, 100));
}

const fetchThreads = async (before?: string) => {
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
  console.log("Starting block of threads");
  let results = [];

  // store the timestamp of the last thread processed, to used in following query
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
        lastMessageId: threads[i].last_message_id,
        user: {
          discordId: threads[i].owner_id,
          discordUsername:
            first_messages[i] && first_messages[i].author.username,
          discordAvatarId: first_messages[i] && first_messages[i].author.avatar,
        },
        messages: messageResults,
        tags: threads[i].applied_tags,
      },
    };

    await prisma.$transaction(
      async (tx) => {
        try {
          await tx.user.upsert({
            where: {
              discordId: res.thread.user.discordId,
            },
            create: {
              discordId: res.thread.user.discordId,
              discordUsername: res.thread.user.discordUsername,
              discordAvatarId: res.thread.user.discordAvatarId,
            },
            update: {
              discordId: res.thread.user.discordId,
              discordUsername: res.thread.user.discordUsername,
              discordAvatarId: res.thread.user.discordAvatarId,
            },
          });
        } catch (err) {
          console.log("Error:", err);
        }

        try {
          await tx.thread.upsert({
            where: {
              id: res.thread.id,
            },
            create: {
              id: res.thread.id,
              title: res.thread.title,
              discordId: res.thread.user.discordId!,
              lastMessageId: res.thread.lastMessageId,
              createdAt: res.thread.createdAt,
              timestamp: res.thread.createdAt
                ? res.thread.createdAt
                : new Date(),
            },
            update: {
              title: res.thread.title,
              discordId: res.thread.discordId,
              lastMessageId: res.thread.lastMessageId,
              createdAt: res.thread.createdAt,
            },
          });
        } catch (err) {
          console.log("Error:", err);
        }

        for (let txm = 0; txm < res.thread.messages.length; txm++) {
          const timestamp = res.thread.messages[txm].updatedAt
            ? res.thread.messages[txm].updatedAt
            : new Date();
          try {
            await tx.message.upsert({
              where: {
                id: res.thread.messages[txm].id,
              },
              create: {
                id: res.thread.messages[txm].id,
                content: res.thread.messages[txm].content,
                threadId: res.thread.messages[txm].threadId,
                timestamp: timestamp!,
                discordId: res.thread.messages[txm].discordId,
              },
              update: {
                content: res.thread.messages[txm].content,
                threadId: res.thread.messages[txm].threadId,
                timestamp: timestamp!,
                discordId: res.thread.messages[txm].discordId,
              },
            });
          } catch (err) {
            console.log("Error:", err);
          }

          for (
            let txi = 0;
            txi < res.thread.messages[txm].images.length;
            txi++
          ) {
            try {
              await tx.image.upsert({
                where: {
                  id: res.thread.messages[txm].images[txi].id,
                },
                create: {
                  id: res.thread.messages[txm].images[txi].id,
                  url: res.thread.messages[txm].images[txi].url,
                  messageId: res.thread.messages[txm].id,
                  height: res.thread.messages[txm].images[txi].height,
                  width: res.thread.messages[txm].images[txi].width,
                },
                update: {
                  url: res.thread.messages[txm].images[txi].url,
                  messageId: res.thread.messages[txm].id,
                  height: res.thread.messages[txm].images[txi].height,
                  width: res.thread.messages[txm].images[txi].width,
                },
              });
            } catch (err) {
              console.log("Error:", err);
            }
          }

          for (
            let txr = 0;
            txr < res.thread.messages[txm].reactions.length;
            txr++
          ) {
            try {
              await tx.reaction.upsert({
                where: {
                  id: `${res.thread.messages[txm].reactions[txr].name}-${res.thread.messages[txm].id}`,
                },
                create: {
                  id: `${res.thread.messages[txm].reactions[txr].name}-${res.thread.messages[txm].id}`,
                  animated: res.thread.messages[txm].reactions[txr].animated,
                  name: res.thread.messages[txm].reactions[txr].name,
                  messageId: res.thread.messages[txm].id,
                },
                update: {
                  animated: res.thread.messages[txm].reactions[txr].animated,
                  name: res.thread.messages[txm].reactions[txr].name,
                },
              });
            } catch (err) {
              console.log("Error:", err);
            }
          }
        }
      },
      {
        timeout: 15000,
      },
    );

    count++;

    lastTimestamp = threads[i].thread_metadata?.archive_timestamp
      .split("+")
      .shift()!;
    console.log(threads[i].id, threads[i].name, count);

    results.push(res);
  }

  console.log("has more", has_more, lastTimestamp);
  if (has_more) {
    processThreads(lastTimestamp);
  } else {
    console.log("Done");
  }
};

await processThreads();
