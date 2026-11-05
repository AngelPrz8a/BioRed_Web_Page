import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
  type ExecuteValues,
} from "mysql2/promise";

type MysqlGlobal = typeof globalThis & { bioredMysqlPool?: Pool };

function getPool() {
  const global = globalThis as MysqlGlobal;
  if (global.bioredMysqlPool) return global.bioredMysqlPool;

  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();
  const password = process.env.MYSQL_PASSWORD;
  if (!host || !user || !database || password === undefined) {
    throw new Error(
      "Configura MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD y MYSQL_DATABASE antes de iniciar BioRed.",
    );
  }
  const port = Number(process.env.MYSQL_PORT ?? 3306);
  const connectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MYSQL_PORT debe ser un puerto válido.");
  }
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
    throw new Error("MYSQL_CONNECTION_LIMIT debe ser un entero positivo.");
  }
  if (process.env.MYSQL_SSL && !["true", "false"].includes(process.env.MYSQL_SSL)) {
    throw new Error("MYSQL_SSL solo acepta true o false.");
  }

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
  global.bioredMysqlPool = pool;
  return pool;
}

export async function queryRows<T extends RowDataPacket>(
  sql: string,
  values: readonly ExecuteValues[] = [],
) {
  const [rows] = await getPool().execute<T[]>(sql, [...values]);
  return rows;
}

export async function queryOne<T extends RowDataPacket>(
  sql: string,
  values: readonly ExecuteValues[] = [],
) {
  const rows = await queryRows<T>(sql, values);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  values: readonly ExecuteValues[] = [],
): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(sql, [...values]);
  return result;
}

export async function withTransaction<T>(
  action: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await action(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closeMysqlPool() {
  const global = globalThis as MysqlGlobal;
  if (!global.bioredMysqlPool) return;
  await global.bioredMysqlPool.end();
  delete global.bioredMysqlPool;
}
