import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { ExecuteValues, PoolConnection, RowDataPacket } from "mysql2/promise";
import { execute, queryOne, queryRows, withTransaction } from "@/lib/server/mysql";
import type {
  AccessLevel,
  AccessStatus,
  AccountStatus,
  AccesoRow,
  AuditoriaRow,
  BioRedTables,
  GlobalRole,
  GrupoRow,
  GrupoUsuarioRow,
  RequestStatus,
  RequestType,
  SolicitudRow,
  UsuarioRow,
} from "@/lib/database-models";

export type {
  GroupRole,
  GroupVisibility,
  MembershipStatus,
} from "@/lib/database-models";

const SESSION_COOKIE = "biored_session";
const SESSION_DURATION = 12 * 60 * 60;
const REMEMBERED_SESSION_DURATION = 30 * 24 * 60 * 60;
const PASSWORD_KEY_LENGTH = 64;

export type AuthenticatedUser = Omit<UsuarioRow, "contrasena_hash"> & {
  memberships: GrupoUsuarioRow[];
};

export type GroupWorkspaceItem = GrupoRow & {
  member_count: number;
  public_module_count: number;
  active_module_count: number;
  my_role: GrupoUsuarioRow["rol_grupo"] | null;
  my_status: GrupoUsuarioRow["estado"] | null;
};

export type GroupMembershipView = GrupoUsuarioRow & {
  nombre_usuario: string;
  correo_usuario: string;
  estado_cuenta: UsuarioRow["estado_cuenta"];
};

export type GroupRequestView = SolicitudRow & {
  nombre_solicitante: string;
  correo_solicitante: string;
};

export type GovernanceRequestView = SolicitudRow & {
  nombre_solicitante: string;
  correo_solicitante: string;
  destino: string;
};

export type GroupDetailData = {
  group: GrupoRow;
  role: GrupoUsuarioRow["rol_grupo"] | null;
  membershipStatus: GrupoUsuarioRow["estado"] | null;
  canManage: boolean;
  modules: Array<{
    id_modulo: number;
    visibilidad: BioRedTables["modulos"][number]["visibilidad"];
    label: string;
    location: string;
    sensors: string[];
  }>;
  members: GroupMembershipView[];
  requests: GroupRequestView[];
};

export type PersonalRequestView = Pick<
  SolicitudRow,
  | "id_solicitud"
  | "tipo"
  | "id_grupo"
  | "id_modulo"
  | "rol_solicitado"
  | "nivel_acceso_solicitado"
  | "estado"
  | "fecha_creacion"
  | "fecha_resolucion"
  | "justificacion_solicitante"
  | "respuesta_resolucion"
> & { destino: string };

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

type SqlConnection = PoolConnection;

async function connectionRows<T extends RowDataPacket>(
  connection: SqlConnection,
  sql: string,
  values: ExecuteValues[] = [],
) {
  const [rows] = await connection.execute<T[]>(sql, values);
  return rows;
}

async function connectionOne<T extends RowDataPacket>(
  connection: SqlConnection,
  sql: string,
  values: ExecuteValues[] = [],
) {
  const rows = await connectionRows<T>(connection, sql, values);
  return rows[0] ?? null;
}

async function audit(
  connection: SqlConnection,
  event: Omit<AuditoriaRow, "id_auditoria" | "fecha">,
) {
  await connection.execute(
    `INSERT INTO auditorias
      (entidad, entidad_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, id_grupo_contexto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.entidad,
      event.entidad_id,
      event.accion,
      event.campo,
      event.valor_anterior,
      event.valor_nuevo,
      event.usuario_id,
      event.id_grupo_contexto,
    ],
  );
}

function serialized(value: unknown) {
  return JSON.stringify(value) ?? "null";
}

function databaseErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}

function handleDuplicate(error: unknown, message: string): never {
  if (databaseErrorCode(error) === "ER_DUP_ENTRY") throw new AuthError(message, 409);
  throw error;
}

function validateJustification(value: string) {
  const justification = value.trim();
  if (justification.length > 500) {
    throw new AuthError("La justificación no puede superar 500 caracteres.", 400);
  }
  return justification || null;
}

async function findUser(userId: number) {
  return queryOne<UsuarioRow & RowDataPacket>(
    "SELECT * FROM usuarios WHERE id_usuario = ? LIMIT 1",
    [userId],
  );
}

async function activeMemberships(userId: number) {
  return queryRows<GrupoUsuarioRow & RowDataPacket>(
    "SELECT * FROM grupo_usuarios WHERE id_usuario = ? AND estado = 'activo'",
    [userId],
  );
}

async function toAuthenticatedUser(user: UsuarioRow, memberships?: GrupoUsuarioRow[]) {
  const { contrasena_hash: _passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    memberships: memberships ?? await activeMemberships(user.id_usuario),
  } satisfies AuthenticatedUser;
}

export async function getPublicCatalogData() {
  const [groups, modules, sensors] = await Promise.all([
    queryRows<GrupoRow & RowDataPacket>(
      "SELECT * FROM grupos WHERE visibilidad = 'publico' ORDER BY nombre",
    ),
    queryRows<BioRedTables["modulos"][number] & RowDataPacket>(
      `SELECT m.* FROM modulos m
       LEFT JOIN grupos g ON g.id_grupo = m.id_grupo
       WHERE m.visibilidad = 'publico' AND (m.id_grupo IS NULL OR g.visibilidad = 'publico')
       ORDER BY m.id_modulo`,
    ),
    queryRows<BioRedTables["sensores"][number] & RowDataPacket>(
      `SELECT s.* FROM sensores s
       JOIN modulos m ON m.id_modulo = s.id_modulo
       LEFT JOIN grupos g ON g.id_grupo = m.id_grupo
       WHERE m.visibilidad = 'publico' AND (m.id_grupo IS NULL OR g.visibilidad = 'publico')
       ORDER BY s.id_sensor`,
    ),
  ]);
  return {
    groups,
    modules,
    sensors,
    moduleLabels: modules.map((module) => ({
      id_modulo: module.id_modulo,
      label: `Módulo ${module.id_modulo}`,
      location: "No especificada",
    })),
  };
}

const groupSelect = `SELECT g.*,
  COUNT(DISTINCT CASE WHEN gu.estado = 'activo' THEN gu.id_grupo_usuarios END) AS member_count,
  COUNT(DISTINCT CASE WHEN m.visibilidad = 'publico' THEN m.id_modulo END) AS public_module_count,
  COUNT(DISTINCT m.id_modulo) AS active_module_count,
  mine.rol_grupo AS my_role, mine.estado AS my_status
  FROM grupos g
  LEFT JOIN grupo_usuarios gu ON gu.id_grupo = g.id_grupo
  LEFT JOIN modulos m ON m.id_grupo = g.id_grupo
  LEFT JOIN grupo_usuarios mine ON mine.id_grupo = g.id_grupo AND mine.id_usuario = ?
  WHERE `;

export async function listGroupsForUser(
  user: AuthenticatedUser | null,
  scope: "public" | "member" | "coordinator" | "all" = "public",
) {
  if (!user || scope === "public") {
    const groups = await queryRows<GroupWorkspaceItem & RowDataPacket>(
      `${groupSelect}g.visibilidad = 'publico' GROUP BY g.id_grupo, mine.rol_grupo, mine.estado ORDER BY g.nombre`,
      [user?.id_usuario ?? 0],
    );
    if (!user) {
      return groups.map((group) => ({ ...group, my_role: null, my_status: null }));
    }
    return groups;
  }
  if (scope === "all" && user.rol_global !== "administrador") {
    throw new AuthError("Solo un administrador puede consultar todos los grupos.", 403);
  }

  const conditions: Record<Exclude<typeof scope, "public">, string> = {
    member: "mine.estado IN ('activo','pendiente')",
    coordinator: "mine.estado = 'activo' AND mine.rol_grupo = 'coordinador'",
    all: "1 = 1",
  };
  return queryRows<GroupWorkspaceItem & RowDataPacket>(
    `${groupSelect}${conditions[scope]} GROUP BY g.id_grupo, mine.rol_grupo, mine.estado ORDER BY g.nombre`,
    [user.id_usuario],
  );
}

async function canReadModule(
  module: BioRedTables["modulos"][number],
  user: AuthenticatedUser | null,
) {
  if (module.visibilidad === "publico") return true;
  if (!user) return false;
  if (user.rol_global === "administrador" || module.id_propietario === user.id_usuario) return true;
  if (module.visibilidad === "identificados") return true;
  const access = await queryOne<RowDataPacket>(
    `SELECT id_acceso FROM v_accesos_vigentes
     WHERE id_usuario = ? AND id_modulo = ? LIMIT 1`,
    [user.id_usuario, module.id_modulo],
  );
  if (access) return true;
  if (module.visibilidad !== "grupo" || module.id_grupo === null) return false;
  const membership = await queryOne<RowDataPacket>(
    `SELECT id_grupo_usuarios FROM grupo_usuarios
     WHERE id_usuario = ? AND id_grupo = ? AND estado = 'activo' LIMIT 1`,
    [user.id_usuario, module.id_grupo],
  );
  return Boolean(membership);
}

export async function getGroupDetailForUser(groupId: number, user: AuthenticatedUser | null) {
  const group = await queryOne<GrupoRow & RowDataPacket>(
    "SELECT * FROM grupos WHERE id_grupo = ? LIMIT 1",
    [groupId],
  );
  if (!group) throw new AuthError("No se encontró el grupo.", 404);
  const membership = user
    ? await queryOne<GrupoUsuarioRow & RowDataPacket>(
        "SELECT * FROM grupo_usuarios WHERE id_grupo = ? AND id_usuario = ? LIMIT 1",
        [groupId, user.id_usuario],
      )
    : null;
  const isAdmin = user?.rol_global === "administrador";
  const canManage =
    isAdmin || membership?.estado === "activo" && membership.rol_grupo === "coordinador";
  if (
    group.visibilidad !== "publico" &&
    membership?.estado !== "activo" &&
    !isAdmin
  ) {
    throw new AuthError("Este grupo no está disponible para tu cuenta.", 404);
  }

  const [allModules, members, requests] = await Promise.all([
    queryRows<BioRedTables["modulos"][number] & RowDataPacket>(
      "SELECT * FROM modulos WHERE id_grupo = ? ORDER BY id_modulo",
      [groupId],
    ),
    canManage
      ? queryRows<GroupMembershipView & RowDataPacket>(
          `SELECT gu.*, u.nombre AS nombre_usuario, u.correo AS correo_usuario,
             u.estado_cuenta
           FROM grupo_usuarios gu JOIN usuarios u ON u.id_usuario = gu.id_usuario
           WHERE gu.id_grupo = ? ORDER BY gu.fecha_ingreso`,
          [groupId],
        )
      : Promise.resolve([] as Array<GroupMembershipView & RowDataPacket>),
    canManage
      ? queryRows<GroupRequestView & RowDataPacket>(
          `SELECT s.*, u.nombre AS nombre_solicitante, u.correo AS correo_solicitante
           FROM solicitudes s JOIN usuarios u ON u.id_usuario = s.id_solicitante
           WHERE s.tipo = 'ingreso_grupo' AND s.id_grupo = ?
           ORDER BY s.fecha_creacion DESC`,
          [groupId],
        )
      : Promise.resolve([] as Array<GroupRequestView & RowDataPacket>),
  ]);

  const visibleModules = [];
  for (const module of allModules) {
    const visible =
      module.visibilidad === "publico" ||
      isAdmin ||
      module.visibilidad === "identificados" && Boolean(user) ||
      module.visibilidad === "grupo" && membership?.estado === "activo" ||
      module.visibilidad === "privado" && await canReadModule(module, user);
    if (!visible) continue;
    const sensors = await queryRows<BioRedTables["sensores"][number] & RowDataPacket>(
      "SELECT * FROM sensores WHERE id_modulo = ? ORDER BY id_sensor",
      [module.id_modulo],
    );
    visibleModules.push({
      id_modulo: module.id_modulo,
      visibilidad: module.visibilidad,
      label: `Módulo ${module.id_modulo}`,
      location: "No especificada",
      sensors: sensors.map((sensor) => sensor.tipo),
    });
  }

  return {
    group,
    role: membership?.estado === "activo" ? membership.rol_grupo : null,
    membershipStatus: membership?.estado ?? null,
    canManage,
    modules: visibleModules,
    members,
    requests,
  } satisfies GroupDetailData;
}

export async function getAuthorizedModuleForUser(
  moduleId: number,
  user: AuthenticatedUser | null,
) {
  const module = await queryOne<BioRedTables["modulos"][number] & RowDataPacket>(
    "SELECT * FROM modulos WHERE id_modulo = ? LIMIT 1",
    [moduleId],
  );
  if (!module || !await canReadModule(module, user)) {
    throw new AuthError("Este módulo no está disponible para tu cuenta.", 404);
  }
  const [group, sensors, access] = await Promise.all([
    module.id_grupo === null
      ? Promise.resolve(null)
      : queryOne<GrupoRow & RowDataPacket>(
          "SELECT * FROM grupos WHERE id_grupo = ? LIMIT 1",
          [module.id_grupo],
        ),
    queryRows<BioRedTables["sensores"][number] & RowDataPacket>(
      "SELECT * FROM sensores WHERE id_modulo = ? ORDER BY id_sensor",
      [moduleId],
    ),
    user
      ? queryOne<AccesoRow & RowDataPacket>(
          `SELECT * FROM v_accesos_vigentes
           WHERE id_usuario = ? AND id_modulo = ? LIMIT 1`,
          [user.id_usuario, moduleId],
        )
      : Promise.resolve(null),
  ]);
  return {
    module,
    label: `Módulo ${moduleId}`,
    location: "No especificada",
    group: group?.nombre ?? null,
    sensors: sensors.map((sensor) => ({
      ...sensor,
      reading: null,
    })),
    access: access?.nivel_acceso ?? null,
  };
}

export async function listUserModuleAccess(userId: number) {
  return queryRows<RowDataPacket & {
    id_modulo: number;
    nivel_acceso: AccessLevel;
    fecha_expiracion: string | null;
  }>(
    `SELECT a.id_modulo, a.nivel_acceso, a.fecha_expiracion
     FROM v_accesos_vigentes a
     WHERE a.id_usuario = ? ORDER BY a.id_modulo`,
    [userId],
  ).then((rows) =>
    rows.map((row) => ({ ...row, label: `Módulo ${row.id_modulo}` })),
  );
}

export async function listManagedGroups(user: AuthenticatedUser) {
  return listGroupsForUser(user, user.rol_global === "administrador" ? "all" : "coordinator");
}

export async function listGovernanceRequests(): Promise<GovernanceRequestView[]> {
  return queryRows<GovernanceRequestView & RowDataPacket>(
    `SELECT s.*, u.nombre AS nombre_solicitante, u.correo AS correo_solicitante,
       COALESCE(g.nombre, CONCAT('Módulo ', s.id_modulo), 'Sin recurso asociado') AS destino
     FROM solicitudes s
     JOIN usuarios u ON u.id_usuario = s.id_solicitante
     LEFT JOIN grupos g ON g.id_grupo = s.id_grupo
     ORDER BY s.fecha_creacion DESC`,
  );
}

export async function listPersonalRequests(userId: number): Promise<PersonalRequestView[]> {
  return queryRows<PersonalRequestView & RowDataPacket>(
    `SELECT s.*,
       COALESCE(g.nombre, CONCAT('Módulo ', s.id_modulo), 'Sin recurso asociado') AS destino
     FROM solicitudes s
     LEFT JOIN grupos g ON g.id_grupo = s.id_grupo
     WHERE s.id_solicitante = ?
     ORDER BY s.fecha_creacion DESC`,
    [userId],
  );
}

async function assertActiveAccount(connection: SqlConnection, userId: number) {
  const user = await connectionOne<UsuarioRow & RowDataPacket>(connection,
    "SELECT * FROM usuarios WHERE id_usuario = ? FOR UPDATE",
    [userId],
  );
  if (!user || user.estado_cuenta !== "activa") {
    throw new AuthError("La cuenta no está activa.", 403);
  }
  return user;
}

async function assertNoPendingRequest(
  connection: SqlConnection,
  userId: number,
  type: RequestType,
  resource: { id_grupo?: number; id_modulo?: number },
) {
  const request = await connectionOne<RowDataPacket>(connection,
    `SELECT id_solicitud FROM solicitudes
     WHERE id_solicitante = ? AND tipo = ? AND estado = 'pendiente'
       AND (? IS NULL OR id_grupo = ?) AND (? IS NULL OR id_modulo = ?)
     LIMIT 1 FOR UPDATE`,
    [
      userId,
      type,
      resource.id_grupo ?? null,
      resource.id_grupo ?? null,
      resource.id_modulo ?? null,
      resource.id_modulo ?? null,
    ],
  );
  if (request) throw new AuthError("Ya tienes una solicitud pendiente para este recurso.", 409);
}

async function insertRequest(
  connection: SqlConnection,
  input: {
    userId: number;
    type: RequestType;
    groupId: number | null;
    moduleId: number | null;
    requestedRole: GrupoUsuarioRow["rol_grupo"] | null;
    accessLevel: AccessLevel | null;
    justification: string | null;
  },
) {
  const [result] = await connection.execute(
    `INSERT INTO solicitudes
      (id_solicitante, tipo, id_modulo, id_grupo, rol_solicitado,
       nivel_acceso_solicitado, justificacion_solicitante)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.type,
      input.moduleId,
      input.groupId,
      input.requestedRole,
      input.accessLevel,
      input.justification,
    ],
  );
  const insertId = (result as { insertId: number }).insertId;
  await audit(connection, {
    entidad: "solicitudes",
    entidad_id: insertId,
    accion: "INSERT",
    campo: null,
    valor_anterior: null,
    valor_nuevo: serialized({
      tipo: input.type,
      id_grupo: input.groupId,
      id_modulo: input.moduleId,
      estado: "pendiente",
    }),
    usuario_id: input.userId,
    id_grupo_contexto: input.groupId,
  });
  return connectionOne<SolicitudRow & RowDataPacket>(connection,
    "SELECT * FROM solicitudes WHERE id_solicitud = ?",
    [insertId],
  );
}

export async function requestGroupMembership(
  groupId: number,
  userId: number,
  justification: string,
) {
  const cleanJustification = validateJustification(justification);
  return withTransaction(async (connection) => {
    await assertActiveAccount(connection, userId);
    const group = await connectionOne<GrupoRow & RowDataPacket>(connection,
      "SELECT * FROM grupos WHERE id_grupo = ?",
      [groupId],
    );
    if (!group) throw new AuthError("No se encontró el grupo.", 404);
    const membership = await connectionOne<GrupoUsuarioRow & RowDataPacket>(connection,
      "SELECT * FROM grupo_usuarios WHERE id_usuario = ? AND id_grupo = ? FOR UPDATE",
      [userId, groupId],
    );
    if (membership?.estado === "activo") {
      throw new AuthError("Ya eres miembro de este grupo.", 409);
    }
    if (membership?.estado === "pendiente") {
      throw new AuthError("Ya tienes una membresía pendiente para este grupo.", 409);
    }
    await assertNoPendingRequest(connection, userId, "ingreso_grupo", { id_grupo: groupId });
    return insertRequest(connection, {
      userId,
      type: "ingreso_grupo",
      groupId,
      moduleId: null,
      requestedRole: "miembro",
      accessLevel: null,
      justification: cleanJustification,
    });
  });
}

export async function requestModuleAccess(
  moduleId: number,
  userId: number,
  accessLevel: AccessLevel,
  justification: string,
) {
  const cleanJustification = validateJustification(justification);
  return withTransaction(async (connection) => {
    await assertActiveAccount(connection, userId);
    const module = await connectionOne<BioRedTables["modulos"][number] & RowDataPacket>(connection,
      "SELECT * FROM modulos WHERE id_modulo = ? FOR UPDATE",
      [moduleId],
    );
    if (!module) throw new AuthError("No se encontró el módulo.", 404);
    if (module.id_propietario === userId) {
      throw new AuthError("No puedes solicitar acceso a un módulo propio.", 409);
    }
    if (module.visibilidad === "publico" || module.visibilidad === "identificados") {
      throw new AuthError("Este módulo no requiere una solicitud de acceso.", 409);
    }
    if (module.visibilidad === "grupo" && module.id_grupo !== null) {
      const membership = await connectionOne<RowDataPacket>(connection,
        `SELECT id_grupo_usuarios FROM grupo_usuarios
         WHERE id_usuario = ? AND id_grupo = ? AND estado = 'activo'`,
        [userId, module.id_grupo],
      );
      if (!membership) throw new AuthError("Solicita primero el ingreso al grupo asociado.", 403);
    }
    const currentAccess = await connectionOne<RowDataPacket>(connection,
      `SELECT id_acceso FROM v_accesos_vigentes
       WHERE id_usuario = ? AND id_modulo = ? LIMIT 1`,
      [userId, moduleId],
    );
    if (currentAccess) throw new AuthError("Ya tienes acceso vigente a este módulo.", 409);
    await assertNoPendingRequest(connection, userId, "acceso_modulo", { id_modulo: moduleId });
    return insertRequest(connection, {
      userId,
      type: "acceso_modulo",
      groupId: null,
      moduleId,
      requestedRole: null,
      accessLevel,
      justification: cleanJustification,
    });
  });
}

export async function requestGroupRoleChange(
  groupId: number,
  userId: number,
  requestedRole: GrupoUsuarioRow["rol_grupo"],
  justification: string,
) {
  const cleanJustification = validateJustification(justification);
  if (requestedRole !== "coordinador") {
    throw new AuthError("Solo se puede solicitar el rol de coordinador.", 400);
  }
  return withTransaction(async (connection) => {
    await assertActiveAccount(connection, userId);
    const membership = await connectionOne<GrupoUsuarioRow & RowDataPacket>(connection,
      `SELECT * FROM grupo_usuarios
       WHERE id_grupo = ? AND id_usuario = ? AND estado = 'activo' FOR UPDATE`,
      [groupId, userId],
    );
    if (!membership) {
      throw new AuthError("Debes ser miembro activo del grupo para solicitar coordinación.", 403);
    }
    if (membership.rol_grupo === requestedRole) {
      throw new AuthError("Ya tienes el rol de coordinador en este grupo.", 409);
    }
    await assertNoPendingRequest(connection, userId, "cambio_rol_grupo", { id_grupo: groupId });
    return insertRequest(connection, {
      userId,
      type: "cambio_rol_grupo",
      groupId,
      moduleId: null,
      requestedRole,
      accessLevel: null,
      justification: cleanJustification,
    });
  });
}

async function resolveRequest(
  connection: SqlConnection,
  requestId: number,
  decision: Extract<RequestStatus, "aprobada" | "rechazada">,
  actorId: number,
  response: string,
) {
  const request = await connectionOne<SolicitudRow & RowDataPacket>(connection,
    "SELECT * FROM solicitudes WHERE id_solicitud = ? FOR UPDATE",
    [requestId],
  );
  if (!request) throw new AuthError("No se encontró la solicitud.", 404);
  if (request.estado !== "pendiente") throw new AuthError("Esta solicitud ya fue atendida.", 409);
  if (decision === "aprobada") {
    await assertActiveAccount(connection, request.id_solicitante);
    if (request.tipo === "ingreso_grupo") {
      if (request.id_grupo === null) throw new AuthError("La solicitud no tiene grupo asociado.", 409);
      const membership = await connectionOne<GrupoUsuarioRow & RowDataPacket>(connection,
        `SELECT * FROM grupo_usuarios
         WHERE id_usuario = ? AND id_grupo = ? FOR UPDATE`,
        [request.id_solicitante, request.id_grupo],
      );
      if (membership?.estado === "activo") {
        throw new AuthError("El usuario ya tiene una membresía activa para este grupo.", 409);
      }
      if (membership) {
        await connection.execute(
          `UPDATE grupo_usuarios SET estado = 'activo', rol_grupo = 'miembro',
             id_solicitud_origen = ?, fecha_ingreso = CURRENT_TIMESTAMP
           WHERE id_grupo_usuarios = ?`,
          [request.id_solicitud, membership.id_grupo_usuarios],
        );
        await audit(connection, {
          entidad: "grupo_usuarios",
          entidad_id: membership.id_grupo_usuarios,
          accion: "UPDATE",
          campo: "estado",
          valor_anterior: membership.estado,
          valor_nuevo: "activo",
          usuario_id: actorId,
          id_grupo_contexto: request.id_grupo,
        });
      } else {
        const [result] = await connection.execute(
          `INSERT INTO grupo_usuarios
            (id_usuario, id_grupo, id_solicitud_origen, estado, rol_grupo)
           VALUES (?, ?, ?, 'activo', 'miembro')`,
          [request.id_solicitante, request.id_grupo, request.id_solicitud],
        );
        await audit(connection, {
          entidad: "grupo_usuarios",
          entidad_id: (result as { insertId: number }).insertId,
          accion: "INSERT",
          campo: null,
          valor_anterior: null,
          valor_nuevo: serialized({
            id_usuario: request.id_solicitante,
            id_grupo: request.id_grupo,
            estado: "activo",
            rol_grupo: "miembro",
          }),
          usuario_id: actorId,
          id_grupo_contexto: request.id_grupo,
        });
      }
    } else if (request.tipo === "acceso_modulo") {
      if (request.id_modulo === null || request.nivel_acceso_solicitado === null) {
        throw new AuthError("La solicitud no contiene módulo o nivel de acceso.", 409);
      }
      const module = await connectionOne<BioRedTables["modulos"][number] & RowDataPacket>(connection,
        "SELECT * FROM modulos WHERE id_modulo = ? FOR UPDATE",
        [request.id_modulo],
      );
      if (!module || module.visibilidad === "publico" || module.visibilidad === "identificados") {
        throw new AuthError("El módulo ya no requiere acceso aprobado o no está disponible.", 409);
      }
      const current = await connectionOne<RowDataPacket>(connection,
        `SELECT id_acceso FROM v_accesos_vigentes
         WHERE id_usuario = ? AND id_modulo = ? LIMIT 1`,
        [request.id_solicitante, request.id_modulo],
      );
      if (current) throw new AuthError("El usuario ya tiene acceso vigente a este módulo.", 409);
      const [result] = await connection.execute(
        `INSERT INTO accesos
          (id_modulo, id_usuario, id_solicitud, nivel_acceso, estado, concedido_por)
         VALUES (?, ?, ?, ?, 'vigente', ?)`,
        [
          request.id_modulo,
          request.id_solicitante,
          request.id_solicitud,
          request.nivel_acceso_solicitado,
          actorId,
        ],
      );
      await audit(connection, {
        entidad: "accesos",
        entidad_id: (result as { insertId: number }).insertId,
        accion: "INSERT",
        campo: null,
        valor_anterior: null,
        valor_nuevo: serialized({
          id_usuario: request.id_solicitante,
          id_modulo: request.id_modulo,
          nivel_acceso: request.nivel_acceso_solicitado,
          estado: "vigente",
        }),
        usuario_id: actorId,
        id_grupo_contexto: module.id_grupo,
      });
    } else {
      if (request.id_grupo === null || request.rol_solicitado === null) {
        throw new AuthError("La solicitud no contiene grupo o rol.", 409);
      }
      const membership = await connectionOne<GrupoUsuarioRow & RowDataPacket>(connection,
        `SELECT * FROM grupo_usuarios
         WHERE id_grupo = ? AND id_usuario = ? AND estado = 'activo' FOR UPDATE`,
        [request.id_grupo, request.id_solicitante],
      );
      if (!membership) {
        throw new AuthError("El solicitante ya no tiene membresía activa en este grupo.", 409);
      }
      await connection.execute(
        `UPDATE grupo_usuarios
         SET rol_grupo = ?, id_solicitud_origen = ?
         WHERE id_grupo_usuarios = ?`,
        [request.rol_solicitado, request.id_solicitud, membership.id_grupo_usuarios],
      );
      await audit(connection, {
        entidad: "grupo_usuarios",
        entidad_id: membership.id_grupo_usuarios,
        accion: "UPDATE",
        campo: "rol_grupo",
        valor_anterior: membership.rol_grupo,
        valor_nuevo: request.rol_solicitado,
        usuario_id: actorId,
        id_grupo_contexto: request.id_grupo,
      });
    }
  }

  await connection.execute(
    `UPDATE solicitudes SET estado = ?, id_responsable = ?,
      fecha_resolucion = CURRENT_TIMESTAMP, respuesta_resolucion = ?
     WHERE id_solicitud = ?`,
    [decision, actorId, response || null, requestId],
  );
  await audit(connection, {
    entidad: "solicitudes",
    entidad_id: requestId,
    accion: "UPDATE",
    campo: "estado",
    valor_anterior: serialized({ estado: request.estado, id_responsable: request.id_responsable }),
    valor_nuevo: serialized({ estado: decision, id_responsable: actorId }),
    usuario_id: actorId,
    id_grupo_contexto: request.id_grupo,
  });
  return connectionOne<SolicitudRow & RowDataPacket>(connection,
    "SELECT * FROM solicitudes WHERE id_solicitud = ?",
    [requestId],
  );
}

export async function decideGovernanceRequest(
  requestId: number,
  decision: Extract<RequestStatus, "aprobada" | "rechazada">,
  actor: AuthenticatedUser,
  responseText: string,
) {
  if (actor.rol_global !== "administrador") {
    throw new AuthError("Solo un administrador puede resolver estas solicitudes.", 403);
  }
  const response = responseText.trim();
  if (response.length > 500) throw new AuthError("La respuesta no puede superar 500 caracteres.", 400);
  return withTransaction((connection) => resolveRequest(connection, requestId, decision, actor.id_usuario, response));
}

export async function createManagedGroup(
  input: { nombre: string; descripcion: string; visibilidad: GrupoRow["visibilidad"] },
  actorId: number,
) {
  const nombre = input.nombre.trim();
  const descripcion = input.descripcion.trim();
  if (nombre.length < 3 || nombre.length > 100) {
    throw new AuthError("El nombre del grupo debe tener entre 3 y 100 caracteres.", 400);
  }
  if (descripcion.length > 1000) throw new AuthError("La descripción no puede superar 1000 caracteres.", 400);
  try {
    return await withTransaction(async (connection) => {
      const [result] = await connection.execute(
        "INSERT INTO grupos (nombre, descripcion, visibilidad) VALUES (?, ?, ?)",
        [nombre, descripcion || null, input.visibilidad],
      );
      const id = (result as { insertId: number }).insertId;
      const group = await connectionOne<GrupoRow & RowDataPacket>(connection,
        "SELECT * FROM grupos WHERE id_grupo = ?",
        [id],
      );
      await audit(connection, {
        entidad: "grupos",
        entidad_id: id,
        accion: "INSERT",
        campo: null,
        valor_anterior: null,
        valor_nuevo: serialized(group),
        usuario_id: actorId,
        id_grupo_contexto: id,
      });
      return group;
    });
  } catch (error) {
    handleDuplicate(error, "Ya existe un grupo con ese nombre.");
  }
}

export async function updateManagedGroup(
  groupId: number,
  change: { nombre?: string; descripcion?: string | null; visibilidad?: GrupoRow["visibilidad"] },
  actorId: number,
) {
  const nombre = change.nombre?.trim();
  const descripcion = change.descripcion?.trim();
  if (nombre !== undefined && (nombre.length < 3 || nombre.length > 100)) {
    throw new AuthError("El nombre del grupo debe tener entre 3 y 100 caracteres.", 400);
  }
  if (descripcion !== undefined && descripcion !== null && descripcion.length > 1000) {
    throw new AuthError("La descripción no puede superar 1000 caracteres.", 400);
  }
  try {
    return await withTransaction(async (connection) => {
      const group = await connectionOne<GrupoRow & RowDataPacket>(connection,
        "SELECT * FROM grupos WHERE id_grupo = ? FOR UPDATE",
        [groupId],
      );
      if (!group) throw new AuthError("No se encontró el grupo.", 404);
      const updated = {
        nombre: nombre ?? group.nombre,
        descripcion: descripcion === undefined ? group.descripcion : descripcion || null,
        visibilidad: change.visibilidad ?? group.visibilidad,
      };
      await connection.execute(
        "UPDATE grupos SET nombre = ?, descripcion = ?, visibilidad = ? WHERE id_grupo = ?",
        [updated.nombre, updated.descripcion, updated.visibilidad, groupId],
      );
      await audit(connection, {
        entidad: "grupos",
        entidad_id: groupId,
        accion: "UPDATE",
        campo: "gobernanza",
        valor_anterior: serialized({
          nombre: group.nombre,
          descripcion: group.descripcion,
          visibilidad: group.visibilidad,
        }),
        valor_nuevo: serialized(updated),
        usuario_id: actorId,
        id_grupo_contexto: groupId,
      });
      return { ...group, ...updated };
    });
  } catch (error) {
    handleDuplicate(error, "Ya existe un grupo con ese nombre.");
  }
}

export async function decideGroupJoinRequest(
  groupId: number,
  requestId: number,
  decision: "aprobada" | "rechazada",
  actor: AuthenticatedUser,
  responseText: string,
) {
  const response = responseText.trim();
  if (response.length > 500) throw new AuthError("La respuesta no puede superar 500 caracteres.", 400);
  return withTransaction(async (connection) => {
    if (actor.rol_global !== "administrador") {
      const coordinator = await connectionOne<RowDataPacket>(connection,
        `SELECT id_grupo_usuarios FROM grupo_usuarios
         WHERE id_usuario = ? AND id_grupo = ? AND estado = 'activo'
           AND rol_grupo = 'coordinador' LIMIT 1`,
        [actor.id_usuario, groupId],
      );
      if (!coordinator) throw new AuthError("No coordinas este grupo.", 403);
    }
    const request = await connectionOne<SolicitudRow & RowDataPacket>(connection,
      `SELECT * FROM solicitudes WHERE id_solicitud = ? AND id_grupo = ?
       AND tipo = 'ingreso_grupo' FOR UPDATE`,
      [requestId, groupId],
    );
    if (!request) throw new AuthError("No se encontró la solicitud de ingreso.", 404);
    if (request.estado !== "pendiente") throw new AuthError("Esta solicitud ya fue atendida.", 409);
    if (decision === "aprobada") {
      await assertActiveAccount(connection, request.id_solicitante);
      const membership = await connectionOne<GrupoUsuarioRow & RowDataPacket>(connection,
        "SELECT * FROM grupo_usuarios WHERE id_usuario = ? AND id_grupo = ? FOR UPDATE",
        [request.id_solicitante, groupId],
      );
      if (membership?.estado === "activo") {
        throw new AuthError("El usuario ya es miembro activo de este grupo.", 409);
      }
      if (membership) {
        await connection.execute(
          `UPDATE grupo_usuarios SET estado = 'activo', rol_grupo = ?,
            id_solicitud_origen = ?, fecha_ingreso = CURRENT_TIMESTAMP
           WHERE id_grupo_usuarios = ?`,
          [request.rol_solicitado ?? "miembro", requestId, membership.id_grupo_usuarios],
        );
      } else {
        await connection.execute(
          `INSERT INTO grupo_usuarios
            (id_usuario, id_grupo, id_solicitud_origen, estado, rol_grupo)
           VALUES (?, ?, ?, 'activo', ?)`,
          [request.id_solicitante, groupId, requestId, request.rol_solicitado ?? "miembro"],
        );
      }
    }
    await connection.execute(
      `UPDATE solicitudes SET estado = ?, id_responsable = ?,
        fecha_resolucion = CURRENT_TIMESTAMP, respuesta_resolucion = ?
       WHERE id_solicitud = ?`,
      [decision, actor.id_usuario, response || null, requestId],
    );
    await audit(connection, {
      entidad: "solicitudes",
      entidad_id: requestId,
      accion: "UPDATE",
      campo: "estado",
      valor_anterior: serialized({ estado: request.estado, id_responsable: request.id_responsable }),
      valor_nuevo: serialized({ estado: decision, id_responsable: actor.id_usuario }),
      usuario_id: actor.id_usuario,
      id_grupo_contexto: groupId,
    });
    return connectionOne<SolicitudRow & RowDataPacket>(connection,
      "SELECT * FROM solicitudes WHERE id_solicitud = ?",
      [requestId],
    );
  });
}

export async function updateGroupMembership(
  groupId: number,
  membershipId: number,
  change: { rol_grupo?: GrupoUsuarioRow["rol_grupo"]; estado?: GrupoUsuarioRow["estado"] },
  actor: AuthenticatedUser,
) {
  if (Object.keys(change).length === 0) {
    throw new AuthError("Indica el rol o estado de membresía para modificar.", 400);
  }
  return withTransaction(async (connection) => {
    const membership = await connectionOne<GrupoUsuarioRow & RowDataPacket>(connection,
      `SELECT * FROM grupo_usuarios
       WHERE id_grupo_usuarios = ? AND id_grupo = ? FOR UPDATE`,
      [membershipId, groupId],
    );
    if (!membership) throw new AuthError("No se encontró el grupo o la membresía.", 404);
    if (actor.rol_global !== "administrador") {
      const coordinator = await connectionOne<RowDataPacket>(connection,
        `SELECT id_grupo_usuarios FROM grupo_usuarios
         WHERE id_usuario = ? AND id_grupo = ? AND estado = 'activo'
           AND rol_grupo = 'coordinador' LIMIT 1`,
        [actor.id_usuario, groupId],
      );
      if (!coordinator) throw new AuthError("No coordinas este grupo.", 403);
      if (change.rol_grupo === "coordinador") {
        throw new AuthError("Solo un administrador puede asignar coordinadores.", 403);
      }
    }
    if (change.estado === "activo") {
      const account = await connectionOne<RowDataPacket>(connection,
        "SELECT estado_cuenta FROM usuarios WHERE id_usuario = ?",
        [membership.id_usuario],
      );
      if (account?.estado_cuenta !== "activa") {
        throw new AuthError("Solo se pueden activar membresías de cuentas activas.", 409);
      }
    }
    const removesCoordinator =
      membership.estado === "activo" &&
      membership.rol_grupo === "coordinador" &&
      (change.estado !== undefined && change.estado !== "activo" ||
        change.rol_grupo !== undefined && change.rol_grupo !== "coordinador");
    if (removesCoordinator) {
      const activeCoordinators = await connectionRows<RowDataPacket>(
        connection,
        `SELECT id_grupo_usuarios FROM grupo_usuarios
         WHERE id_grupo = ? AND estado = 'activo' AND rol_grupo = 'coordinador'
           AND id_grupo_usuarios <> ? FOR UPDATE`,
        [groupId, membershipId],
      );
      if (activeCoordinators.length === 0) {
        throw new AuthError("No se puede retirar al último coordinador activo del grupo.", 409);
      }
    }
    const updated = {
      rol_grupo: change.rol_grupo ?? membership.rol_grupo,
      estado: change.estado ?? membership.estado,
    };
    await connection.execute(
      `UPDATE grupo_usuarios SET rol_grupo = ?, estado = ?
       WHERE id_grupo_usuarios = ?`,
      [updated.rol_grupo, updated.estado, membershipId],
    );
    await audit(connection, {
      entidad: "grupo_usuarios",
      entidad_id: membershipId,
      accion: "UPDATE",
      campo: "gobernanza",
      valor_anterior: serialized({
        rol_grupo: membership.rol_grupo,
        estado: membership.estado,
      }),
      valor_nuevo: serialized(updated),
      usuario_id: actor.id_usuario,
      id_grupo_contexto: groupId,
    });
    return { ...membership, ...updated };
  });
}

function derivePassword(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      PASSWORD_KEY_LENGTH,
      { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, derived) => error ? reject(error) : resolve(derived),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await derivePassword(password, salt);
  return `scrypt$16384$8$1$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string | null) {
  const parts = storedHash?.split("$") ?? [];
  if (
    parts.length !== 6 ||
    parts[0] !== "scrypt" ||
    parts[1] !== "16384" ||
    parts[2] !== "8" ||
    parts[3] !== "1" ||
    !/^[a-f0-9]{32}$/i.test(parts[4]) ||
    !/^[a-f0-9]{128}$/i.test(parts[5])
  ) {
    await derivePassword(password, Buffer.alloc(16, 0x42));
    return false;
  }
  const actual = await derivePassword(password, Buffer.from(parts[4], "hex"));
  return timingSafeEqual(actual, Buffer.from(parts[5], "hex"));
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 100) {
    throw new AuthError("Escribe un nombre entre 2 y 100 caracteres.", 400);
  }
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError("Escribe un correo electrónico válido.", 400);
  }
  if (input.password.length < 8 || input.password.length > 128) {
    throw new AuthError("La contraseña debe tener entre 8 y 128 caracteres.", 400);
  }
  const passwordHash = await hashPassword(input.password);
  try {
    return await withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol_global, estado_cuenta)
         VALUES (?, ?, ?, 'usuario', 'activa')`,
        [name, email, passwordHash],
      );
      const user = await connectionOne<UsuarioRow & RowDataPacket>(connection,
        "SELECT * FROM usuarios WHERE id_usuario = ?",
        [(result as { insertId: number }).insertId],
      );
      if (!user) throw new Error("No se pudo recuperar la cuenta recién creada.");
      return toAuthenticatedUser(user, []);
    });
  } catch (error) {
    handleDuplicate(error, "Ya existe una cuenta con ese correo.");
  }
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number, remember: boolean) {
  const token = randomBytes(32).toString("base64url");
  const lifetime = remember ? REMEMBERED_SESSION_DURATION : SESSION_DURATION;
  const expiresAt = new Date(Date.now() + lifetime * 1000);
  await withTransaction(async (connection) => {
    await connection.execute(
      "DELETE FROM sesiones_app WHERE expira_en <= UTC_TIMESTAMP()",
    );
    await connection.execute(
      `INSERT INTO sesiones_app (id_usuario, token_hash, expira_en)
       VALUES (?, ?, ?)`,
      [userId, tokenHash(token), expiresAt],
    );
  });
  return { token, maxAge: lifetime };
}

export async function revokeSession(token: string) {
  if (token.length > 128) return;
  await execute("DELETE FROM sesiones_app WHERE token_hash = ?", [tokenHash(token)]);
}

export async function authenticateUser(email: string, password: string) {
  if (email.length > 150 || password.length > 128) {
    throw new AuthError("Correo o contraseña incorrectos, o cuenta no activa.", 401);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await queryOne<UsuarioRow & RowDataPacket>(
    "SELECT * FROM usuarios WHERE correo = ? LIMIT 1",
    [normalizedEmail],
  );
  const validPassword = await verifyPassword(password, user?.contrasena_hash ?? null);
  if (!user || !validPassword || user.estado_cuenta !== "activa") {
    throw new AuthError("Correo o contraseña incorrectos, o cuenta no activa.", 401);
  }
  return toAuthenticatedUser(user);
}

export async function getCurrentUser(token: string | undefined): Promise<AuthenticatedUser | null> {
  if (!token || token.length > 128) return null;
  const user = await queryOne<UsuarioRow & RowDataPacket>(
    `SELECT u.* FROM sesiones_app s
     JOIN usuarios u ON u.id_usuario = s.id_usuario
     WHERE s.token_hash = ? AND s.expira_en > UTC_TIMESTAMP()
       AND u.estado_cuenta = 'activa'
     LIMIT 1`,
    [tokenHash(token)],
  );
  return user ? toAuthenticatedUser(user) : null;
}

export async function updateUserGovernance(
  userId: number,
  change: { rol_global?: GlobalRole; estado_cuenta?: AccountStatus },
  actorId: number,
) {
  if (Object.keys(change).length === 0) {
    throw new AuthError("Indica un rol global o estado de cuenta para modificar.", 400);
  }
  return withTransaction(async (connection) => {
    const user = await connectionOne<UsuarioRow & RowDataPacket>(connection,
      "SELECT * FROM usuarios WHERE id_usuario = ? FOR UPDATE",
      [userId],
    );
    if (!user) throw new AuthError("No se encontró el usuario.", 404);
    const removesActiveAdmin =
      user.rol_global === "administrador" &&
      user.estado_cuenta === "activa" &&
      (change.rol_global === "usuario" ||
        change.estado_cuenta !== undefined && change.estado_cuenta !== "activa");
    if (removesActiveAdmin) {
      const activeAdmins = await connectionRows<RowDataPacket>(
        connection,
        `SELECT id_usuario FROM usuarios
         WHERE rol_global = 'administrador' AND estado_cuenta = 'activa'
         FOR UPDATE`,
      );
      if (activeAdmins.length <= 1) {
        throw new AuthError("No se puede desactivar o degradar al último administrador activo.", 409);
      }
    }
    const updated = {
      rol_global: change.rol_global ?? user.rol_global,
      estado_cuenta: change.estado_cuenta ?? user.estado_cuenta,
    };
    await connection.execute(
      "UPDATE usuarios SET rol_global = ?, estado_cuenta = ? WHERE id_usuario = ?",
      [updated.rol_global, updated.estado_cuenta, userId],
    );
    if (updated.estado_cuenta !== "activa") {
      await connection.execute("DELETE FROM sesiones_app WHERE id_usuario = ?", [userId]);
    }
    await audit(connection, {
      entidad: "usuarios",
      entidad_id: userId,
      accion: "UPDATE",
      campo: "gobernanza",
      valor_anterior: serialized({
        rol_global: user.rol_global,
        estado_cuenta: user.estado_cuenta,
      }),
      valor_nuevo: serialized(updated),
      usuario_id: actorId,
      id_grupo_contexto: null,
    });
    return {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      ...updated,
    };
  });
}

export async function listGovernanceUsers() {
  return queryRows<Omit<UsuarioRow, "contrasena_hash"> & RowDataPacket>(
    `SELECT id_usuario, nombre, correo, rol_global, estado_cuenta, fecha_registro
     FROM usuarios ORDER BY fecha_registro DESC`,
  );
}

export async function listGovernanceMemberships() {
  return queryRows<GrupoUsuarioRow & RowDataPacket>(
    `SELECT gu.*, u.nombre AS usuario, g.nombre AS grupo
     FROM grupo_usuarios gu
     JOIN usuarios u ON u.id_usuario = gu.id_usuario
     JOIN grupos g ON g.id_grupo = gu.id_grupo
     ORDER BY g.nombre, u.nombre`,
  );
}

export async function createMembershipGovernance(
  input: {
    id_usuario: number;
    id_grupo: number;
    rol_grupo: GrupoUsuarioRow["rol_grupo"];
    estado: GrupoUsuarioRow["estado"];
  },
  actorId: number,
) {
  try {
    return await withTransaction(async (connection) => {
      const user = await connectionOne<RowDataPacket>(connection,
        "SELECT estado_cuenta FROM usuarios WHERE id_usuario = ? FOR UPDATE",
        [input.id_usuario],
      );
      if (!user) throw new AuthError("No se encontró el usuario.", 404);
      if (user.estado_cuenta !== "activa" && input.estado === "activo") {
        throw new AuthError("Solo se pueden activar membresías de cuentas activas.", 409);
      }
      const group = await connectionOne<GrupoRow & RowDataPacket>(connection,
        "SELECT * FROM grupos WHERE id_grupo = ?",
        [input.id_grupo],
      );
      if (!group) throw new AuthError("No se encontró el grupo.", 404);
      const [result] = await connection.execute(
        `INSERT INTO grupo_usuarios (id_usuario, id_grupo, rol_grupo, estado)
         VALUES (?, ?, ?, ?)`,
        [input.id_usuario, input.id_grupo, input.rol_grupo, input.estado],
      );
      const membershipId = (result as { insertId: number }).insertId;
      const membership = await connectionOne<GrupoUsuarioRow & RowDataPacket>(connection,
        "SELECT * FROM grupo_usuarios WHERE id_grupo_usuarios = ?",
        [membershipId],
      );
      await audit(connection, {
        entidad: "grupo_usuarios",
        entidad_id: membershipId,
        accion: "INSERT",
        campo: null,
        valor_anterior: null,
        valor_nuevo: serialized(input),
        usuario_id: actorId,
        id_grupo_contexto: input.id_grupo,
      });
      return membership;
    });
  } catch (error) {
    handleDuplicate(error, "El usuario ya tiene una membresía para ese grupo.");
  }
}

export async function updateMembershipGovernance(
  membershipId: number,
  change: { rol_grupo?: GrupoUsuarioRow["rol_grupo"]; estado?: GrupoUsuarioRow["estado"] },
  actorId: number,
) {
  if (Object.keys(change).length === 0) {
    throw new AuthError("Indica el rol o estado de membresía para modificar.", 400);
  }
  return withTransaction(async (connection) => {
    const membership = await connectionOne<GrupoUsuarioRow & RowDataPacket>(connection,
      "SELECT * FROM grupo_usuarios WHERE id_grupo_usuarios = ? FOR UPDATE",
      [membershipId],
    );
    if (!membership) throw new AuthError("No se encontró la membresía.", 404);
    const updated = {
      rol_grupo: change.rol_grupo ?? membership.rol_grupo,
      estado: change.estado ?? membership.estado,
    };
    await connection.execute(
      `UPDATE grupo_usuarios SET rol_grupo = ?, estado = ?
       WHERE id_grupo_usuarios = ?`,
      [updated.rol_grupo, updated.estado, membershipId],
    );
    await audit(connection, {
      entidad: "grupo_usuarios",
      entidad_id: membershipId,
      accion: "UPDATE",
      campo: "gobernanza",
      valor_anterior: serialized({
        rol_grupo: membership.rol_grupo,
        estado: membership.estado,
      }),
      valor_nuevo: serialized(updated),
      usuario_id: actorId,
      id_grupo_contexto: membership.id_grupo,
    });
    return { ...membership, ...updated };
  });
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
