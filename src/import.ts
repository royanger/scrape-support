import { PrismaClient } from "@prisma/client";
import { createWithSlugFn } from "prisma-extension-create-with-slug";

// load prisma with slugify plugin
const prisma = new PrismaClient().$extends(createWithSlugFn());

// will need to pass this as CLI argument now
const path = "./results.json";
const file = Bun.file(path);

// load file with types
const contents: Thread[] = await file.json();

interface Thread {
  thread: {
    id: string;
    title: string;
    discordId: string;
    createdAt?: Date;
    lastMessageId: string;
    tags: string[];
    users: UsersItem[];
    messages: MessagesItem[];
  };
}

interface UsersItem {
  discordId: string;
  discordUsername: string;
  discordAvatarId: string | null;
}
interface MessagesItem {
  id: string;
  content: string;
  threadId: string;
  createdAt?: Date;
  updatedAt?: null | Date;
  discordId: string;
  hasImages?: boolean;
  attachments: AttachmentsItem[];
  tags: string[];
}
interface AttachmentsItem {
  id: string;
  url: string;
  width?: number;
  height?: number;
  filename: string;
  contentType: string;
}

for (let t = 0; t < contents.length; t++) {
  // start a transaction for each thread and its associated data
  await prisma.$transaction(
    async (tx) => {
      // loop over all users from thread (author, bots, people who replied)
      // add all to DB
      for (let u = 0; u < contents[t].thread.users.length; u++) {
        try {
          await tx.user.upsert({
            where: {
              discordId: contents[t].thread.users[u].discordId,
            },
            create: {
              discordId: contents[t].thread.users[u].discordId,
              discordUsername: contents[t].thread.users[u].discordUsername,
              discordAvatarId: contents[t].thread.users[u].discordAvatarId,
            },
            update: {
              discordUsername: contents[t].thread.users[u].discordUsername,
              discordAvatarId: contents[t].thread.users[u].discordAvatarId,
            },
          });
          console.log("done adding users for thread");
        } catch (err) {
          console.log("Error:", err);
        }
      }

      // create the thread. Need a 3 part query because of slugify plugin
      try {
        const existingThread = await prisma.thread.findUnique({
          where: {
            id: contents[t].thread.id,
          },
        });
        if (!existingThread?.id) {
          await prisma.thread.createWithSlug({
            data: {
              id: contents[t].thread.id,
              title: contents[t].thread.title,
              discordId: contents[t].thread.discordId!,
              lastMessageId: contents[t].thread.lastMessageId,
              createdAt: contents[t].thread.createdAt,
            },
            sourceField: "title",
            targetField: "slug",
            unique: true,
          });
        } else {
          await prisma.thread.update({
            where: {
              id: contents[t].thread.id,
            },
            data: {
              title: contents[t].thread.title,
              discordId: contents[t].thread.discordId,
              lastMessageId: contents[t].thread.lastMessageId,
              updatedAt: new Date(),
            },
          });
        }
        console.log("done adding thread");
      } catch (err) {
        console.log("Error:", err);
      }

      // loop over messages. Check to make sure there are messages
      for (let txm = 0; txm < contents[t].thread.messages.length; txm++) {
        const updatedAt = contents[t].thread.messages[txm].updatedAt
          ? contents[t].thread.messages[txm].updatedAt
          : contents[t].thread.messages[txm].createdAt;

        try {
          const res = await tx.message.upsert({
            where: {
              id: contents[t].thread.messages[txm].id,
            },
            create: {
              id: contents[t].thread.messages[txm].id!,
              content: contents[t].thread.messages[txm].content,
              threadId: contents[t].thread.messages[txm].threadId,
              discordId: contents[t].thread.messages[txm].discordId,
              createdAt: contents[t].thread.messages[txm].createdAt,
              updatedAt,
            },
            update: {
              content: contents[t].thread.messages[txm].content,
              threadId: contents[t].thread.messages[txm].threadId,
              discordId: contents[t].thread.messages[txm].discordId,
              updatedAt,
            },
          });
        } catch (err) {
          console.log("Error:", err);
        }

        // loop over attachments, if they exist
        if (
          contents[t].thread.messages[txm].attachments &&
          contents[t].thread.messages[txm].attachments?.length > 0
        ) {
          for (
            let txi = 0;
            txi < contents[t].thread.messages[txm].attachments?.length;
            txi++
          ) {
            try {
              await tx.attachment.upsert({
                where: {
                  id: contents[t].thread.messages[txm].attachments[txi].id,
                },
                create: {
                  id: contents[t].thread.messages[txm].attachments[txi].id,
                  url: contents[t].thread.messages[txm].attachments[txi].url,
                  messageId: contents[t].thread.messages[txm].id,
                  height:
                    contents[t].thread.messages[txm].attachments[txi].height,
                  width:
                    contents[t].thread.messages[txm].attachments[txi].width,
                  contentType:
                    contents[t].thread.messages[txm].attachments[txi]
                      .contentType,
                },
                update: {
                  url: contents[t].thread.messages[txm].attachments[txi].url,
                  messageId: contents[t].thread.messages[txm].id,
                  height:
                    contents[t].thread.messages[txm].attachments[txi].height,
                  width:
                    contents[t].thread.messages[txm].attachments[txi].width,
                  contentType:
                    contents[t].thread.messages[txm].attachments[txi]
                      .contentType,
                },
              });
            } catch (err) {
              console.log("Error:", err);
            }
          }
        }
      }

      // loop over tags if they exist
      if (contents[t].thread.tags && contents[t].thread.tags?.length > 0) {
        for (let txt = 0; txt < contents[t].thread.tags?.length; txt++) {
          try {
            const tagId = contents[t].thread.tags[txt];
            const threadId = contents[t].thread.id;
            await tx.threadTag.upsert({
              where: { id: `${tagId}-${threadId}` },
              create: {
                id: `${tagId}-${threadId}`,
                tagId,
                threadId,
              },
              update: {
                tagId,
                threadId,
              },
            });
          } catch (err) {
            console.log("Error:", err);
          }
        }
      }
    },
    {
      timeout: 1500000,
    },
  );
}
