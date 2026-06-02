import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

function getDatabase() {
  database ??= createDatabase();
  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    return Reflect.get(getDatabase(), property, receiver);
  },
});

export type Db = Database;
