declare module "bun" {
  interface Env {
    DATABASE_URL: string;
    DATABASE_HOST: string;
    DATABASE_USERNAME: string;
    DATABASE_PASSWORD: string;
    DISCORD_TOKEN: string;
    DISCORD_FORUM: string;
  }
}
