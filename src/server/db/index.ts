import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;
type Database = ReturnType<typeof createDatabase>;

declare global {
  var __mocciPostgresClient: SqlClient | undefined;
  var __mocciDatabase: Database | undefined;
}

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return connectionString;
}

function createPostgresClient() {
  return postgres(getConnectionString(), {
    prepare: false,
    max: Number(process.env.DATABASE_MAX_CONNECTIONS ?? 1),
    idle_timeout: 5,
    connect_timeout: 10,
    max_lifetime: 60,
  });
}

function getPostgresClient() {
  globalThis.__mocciPostgresClient ??= createPostgresClient();
  return globalThis.__mocciPostgresClient;
}

function createDatabase() {
  return drizzle(getPostgresClient(), { schema });
}

function getDatabase() {
  globalThis.__mocciDatabase ??= createDatabase();
  return globalThis.__mocciDatabase;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    return Reflect.get(getDatabase(), property, receiver);
  },
});

export type Db = Database;
