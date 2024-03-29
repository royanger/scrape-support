declare module "bun" {
  interface Env {
    DATABASE_URL: string;
    DISCORD_TOKEN: string;
    DISCORD_SERVER: string;
  }
}
