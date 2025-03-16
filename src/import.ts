import 'dotenv/config'
import { Client } from '@planetscale/database'
import { drizzle } from 'drizzle-orm/planetscale-serverless'
import * as schema from './drizzle/schema'
import friendlyWords from "friendly-words";
import { eq } from 'drizzle-orm'

const client = new Client({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
})

export const db = drizzle(client, { schema })

import log4js from "log4js";
import slugify from '@sindresorhus/slugify';

log4js.configure({
  appenders: {
    import: { type: "file", filename: "import/import.log" },
  },
  categories: {
    default: { appenders: ["import"], level: "trace" },
  },
});
const logger = log4js.getLogger("import");


// will need to pass this as CLI argument now
// this is the number of files to process in /exports -> `bun import 47`
const files = Bun.argv[2];

let threadCount = 1;

for (let currentFile = 1; currentFile <= parseInt(files); currentFile++) {
  console.log("File:", currentFile);
  const file = Bun.file(`./exports/results-${currentFile}.json`);

  // load file with types
  const contents: Thread[] = await file.json();

  interface Thread {
    thread: {
      id: string;
      title: string;
      ownerId: string;
      createdAt: Date;
      tags: string[];
      users: UsersItem[];
      messages: MessagesItem[];
    };
  }

  interface UsersItem {
    userId: string;
    discordUsername: string;
    discordAvatarId: string | null;
  }
  interface MessagesItem {
    id: string;
    content: string;
    threadId: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    tags: string[];
  }

  const usersSet = new Set()
  const messageSet = new Set()
  const threadTagSet = new Set()

  for (let t = 0; t < contents.length; t++) {

    // start a transaction for each thread and its associated data
    await db.transaction(async (tx) => {
      // loop over all users from thread (author, bots, people who replied)
      // add all to DB
      for (let u = 0; u < contents[t].thread.users.length; u++) {
        const usersIter = usersSet.entries();
        const userArray = []
        for (const user of usersIter) {
          userArray.push(user)
        }

        if (!usersSet.has(contents[t].thread.users[u].userId)) {
          let anonymousUsername: string = "";

          const generateAnonymousUsername = async (): Promise<void> => {
            const stringOne =
              friendlyWords.predicates[
              Math.floor(Math.random() * friendlyWords.predicates.length)
              ];
            const stringTwo =
              friendlyWords.objects[
              Math.floor(Math.random() * friendlyWords.objects.length)
              ];

            const username = `${stringOne.charAt(0).toUpperCase()}${stringOne.slice(1)} ${stringTwo.charAt(0).toUpperCase()}${stringTwo.slice(1)}`;

            const res = await tx.query.user.findFirst({
              where: eq(schema.user.anonymousUsername, username)
            });

            if (res) {
              return generateAnonymousUsername();
            }
            anonymousUsername = username;
            return;
          };

          await generateAnonymousUsername();

          function generateRandomGradient() {
            const colorOne = generateRandomColor(1);
            const colorTwo = generateRandomColor();
            const colorThree = generateRandomColor();
            const colorFour = generateRandomColor();
            return {
              background: `radial-gradient(at ${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%, ${colorOne} 0px, ${colorTwo} 55%),radial-gradient(at ${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%, ${colorThree} 0px, transparent 55%),radial-gradient(at ${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%, ${colorFour} 0px, transparent 55%),radial-gradient(at ${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%, ${colorFour} 0px, transparent 55%),radial-gradient(at ${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%, ${colorThree} 0px, transparent 55%),radial-gradient(at ${Math.floor(Math.random() * 100)}% ${Math.floor(Math.random() * 100)}%, ${colorTwo} 0px, transparent 55%) `,
              backgroundColor: `${colorOne}`,
            };
          }

          function generateRandomColor(transparency?: number) {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            return `rgba(${r}, ${g}, ${b}, ${transparency ? transparency : Math.random()})`;
          }

          const anonymousAvatar = generateRandomGradient();

          try {
            await tx.insert(schema.user)
              .values({
                discordId: contents[t].thread.users[u].userId,
                discordUsername: contents[t].thread.users[u].discordUsername,
                discordAvatarId: contents[t].thread.users[u].discordAvatarId,
                anonymousUsername: anonymousUsername,
                anonymousAvatarJSON: anonymousAvatar,
              })
              .onDuplicateKeyUpdate({
                set: {
                  discordUsername: contents[t].thread.users[u].discordUsername,
                  discordAvatarId: contents[t].thread.users[u].discordAvatarId,
                }
              })


            usersSet.add(contents[t].thread.users[u].userId)
            logger.info(`User: ${usersSet.size} - ${contents[t].thread.users[u].userId} - ${contents[t].thread.users[u].discordUsername}`)
          } catch (err) {
            logger.error(`USer: Error inserting user ${usersSet.size} - ${contents[t].thread.users[u].userId} - ${JSON.stringify(err)}`)
          }
        }
      }

      if (usersSet.has(contents[t].thread.ownerId)) {
        try {
          const threadObj = {
            title: contents[t].thread.title,
            createdAt: new Date(contents[t].thread.createdAt),
            userId: contents[t].thread.ownerId,
            slug: slugify(contents[t].thread.title),
          }

          await tx.insert(schema.thread)
            .values({
              id: contents[t].thread.id,
              ...threadObj
            })
            .onDuplicateKeyUpdate({
              set: {
                ...threadObj
              }
            })
          logger.info(`Thread: ${threadCount} - ${contents[t].thread.id} - ${contents[t].thread.title}`)
        } catch (err: any) {
          logger.error(`Thread: Error inserting thread ${threadCount} - ${contents[t].thread.id} - ${JSON.stringify(err)}`)
        }
      } else {
        logger.error(`Thread: Error inserting ${contents[t].thread.id}, user ${contents[t].thread.ownerId} not processed`)
      }



      // loop over messages. Check to make sure there are messages
      for (let txm = 0; txm < contents[t].thread.messages.length; txm++) {

        if (usersSet.has(contents[t].thread.messages[txm].userId)) {

          try {
            const messageObj = {
              threadId: contents[t].thread.messages[txm].threadId,
              content: contents[t].thread.messages[txm].content,
              createdAt: new Date(contents[t].thread.messages[txm].createdAt),
              userId: contents[t].thread.messages[txm].userId
            }

            await tx.insert(schema.message)
              .values({
                id: contents[t].thread.messages[txm].id,
                ...messageObj
              })
              .onDuplicateKeyUpdate({
                set: {
                  ...messageObj
                },
              });
            messageSet.add(contents[t].thread.messages[txm].id)
            logger.info(`Message: ${messageSet.size} - ${contents[t].thread.messages[txm].id}`)
          } catch (err) {
            logger.error(`Message: Error inserting ${messageSet.size} - ${contents[t].thread.messages[txm].id} - ${JSON.stringify(err)}`)
          }
        } else {
          logger.error(`Message: Error inserting ${contents[t].thread.messages[txm].id}, user ${contents[t].thread.messages[txm].userId} not processed`)
        }
      }

      // loop over tags if they exist
      if (contents[t].thread.tags && contents[t].thread.tags?.length > 0) {

        for (const tag of contents[t].thread.tags) {
          try {
            await tx.insert(schema.threadTag)
              .values({
                threadId: contents[t].thread.id,
                tagId: tag
              })
              .onDuplicateKeyUpdate({
                set: {
                  threadId: contents[t].thread.id,
                  tagId: tag
                }
              })
            threadTagSet.add(`${contents[t].thread.id}-${tag}`)
            logger.info(`Thread Tag: ${threadTagSet.size} -  ${contents[t].thread.id}-${tag}`)

          } catch (err) {
            logger.error(`Thread Tag: Error inserting ${threadTagSet.size} -  ${contents[t].thread.id}-${tag}`)
          }
        }
      }

      console.log(`Done thread ${threadCount} -- ${contents[t].thread.title}  ${contents[t].thread.id}`);
      threadCount++;
    },
    );
  }
}
