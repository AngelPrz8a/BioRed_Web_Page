import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";
import { StringDecoder } from "node:string_decoder";
import { stdin, stdout } from "node:process";
import mysql from "mysql2/promise";

const scryptAsync = promisify(scrypt);

function mysqlConfig() {
  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();
  const password = process.env.MYSQL_PASSWORD;
  const port = Number(process.env.MYSQL_PORT ?? 3306);
  const connectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10);
  if (!host || !user || !database || password === undefined) {
    throw new Error("Configura MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD y MYSQL_DATABASE.");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MYSQL_PORT debe ser un puerto válido.");
  }
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
    throw new Error("MYSQL_CONNECTION_LIMIT debe ser un entero positivo.");
  }
  if (process.env.MYSQL_SSL && !["true", "false"].includes(process.env.MYSQL_SSL)) {
    throw new Error("MYSQL_SSL solo acepta true o false.");
  }
  return {
    host,
    port,
    user,
    password,
    database,
    charset: "utf8mb4",
    timezone: "Z",
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  };
}

function readHidden(question) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Ejecuta este comando en una terminal interactiva para proteger la contraseña.");
  }
  return new Promise((resolve, reject) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    let value = "";
    const onData = (chunk) => {
      const decoder = onData.decoder;
      for (const character of decoder.write(chunk)) {
        if (character === "\u0003") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdout.write("\n");
          reject(new Error("Operación cancelada."));
          return;
        }
        if (character === "\r" || character === "\n") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\b" || character === "\u007f") {
          value = Array.from(value).slice(0, -1).join("");
        } else if (character >= " ") {
          value += character;
        }
      }
    };
    onData.decoder = new StringDecoder("utf8");
    stdin.on("data", onData);
  });
}

async function main() {
  const config = mysqlConfig();
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const nombre = (await prompt.question("Nombre del administrador: ")).trim();
    const correo = (await prompt.question("Correo del administrador: ")).trim().toLowerCase();
    prompt.close();

    if (nombre.length < 2 || nombre.length > 100) {
      throw new Error("El nombre debe tener entre 2 y 100 caracteres.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 150) {
      throw new Error("Escribe un correo electrónico válido.");
    }

    const password = await readHidden("Contraseña (mínimo 12 caracteres): ");
    const confirmation = await readHidden("Confirma la contraseña: ");
    if (password.length < 12 || password.length > 128) {
      throw new Error("La contraseña debe tener entre 12 y 128 caracteres.");
    }
    if (password !== confirmation) throw new Error("Las contraseñas no coinciden.");

    const salt = randomBytes(16);
    const derived = await scryptAsync(password, salt, 64, {
      N: 16_384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    const passwordHash = `scrypt$16384$8$1$${salt.toString("hex")}$${derived.toString("hex")}`;
    const connection = await mysql.createConnection(config);
    let lockAcquired = false;
    let transactionStarted = false;
    try {
      const [lockRows] = await connection.execute(
        "SELECT GET_LOCK('biored_bootstrap_admin', 10) AS acquired",
      );
      lockAcquired = lockRows[0]?.acquired === 1;
      if (!lockAcquired) throw new Error("No se pudo reservar el proceso de creación del administrador.");

      const [existingRows] = await connection.execute(
        "SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1",
        [correo],
      );
      if (existingRows.length) {
        throw new Error("Ya existe una cuenta con ese correo; no se modificó ninguna cuenta.");
      }

      const [adminRows] = await connection.execute(
        `SELECT id_usuario FROM usuarios
         WHERE rol_global = 'administrador' AND estado_cuenta = 'activa'
         LIMIT 1`,
      );
      if (adminRows.length) {
        throw new Error("Ya existe un administrador activo. Usa la gestión de usuarios de BioRed.");
      }

      await connection.beginTransaction();
      transactionStarted = true;
      const [result] = await connection.execute(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol_global, estado_cuenta)
         VALUES (?, ?, ?, 'administrador', 'activa')`,
        [nombre, correo, passwordHash],
      );
      await connection.execute(
        `INSERT INTO auditorias
          (entidad, entidad_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, id_grupo_contexto)
         VALUES ('usuarios', ?, 'INSERT', NULL, NULL, ?, ?, NULL)`,
        [
          result.insertId,
          JSON.stringify({ nombre, correo, rol_global: "administrador", estado_cuenta: "activa" }),
          result.insertId,
        ],
      );
      await connection.commit();
      transactionStarted = false;
      stdout.write(`Administrador creado para ${correo}.\n`);
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      try {
        if (lockAcquired) {
          await connection.execute("SELECT RELEASE_LOCK('biored_bootstrap_admin')");
        }
      } finally {
        await connection.end();
      }
    }
  } finally {
    prompt.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
