export type GlobalRole = "administrador" | "usuario";
export type AccountStatus = "activa" | "inactiva" | "suspendida" | "pendiente";
export type GroupVisibility = "publico" | "privado";
export type ModuleVisibility = "publico" | "identificados" | "grupo" | "privado";
export type MembershipStatus = "activo" | "inactivo" | "pendiente";
export type GroupRole = "miembro" | "coordinador";
export type RequestType = "acceso_modulo" | "ingreso_grupo" | "cambio_rol_grupo";
export type RequestStatus = "pendiente" | "aprobada" | "rechazada" | "cancelada";
export type AccessLevel = "lectura" | "escritura";
export type AccessStatus = "vigente" | "revocado" | "caducado";

export type MySqlDateTime = string;
export type MySqlJson = unknown;

export type UsuarioRow = {
  id_usuario: number;
  nombre: string;
  correo: string;
  contrasena_hash: string;
  rol_global: GlobalRole;
  estado_cuenta: AccountStatus;
  fecha_registro: MySqlDateTime;
};

export type EtiquetaRow = {
  id_etiqueta: number;
  nombre: string;
  estado: "activa" | "inactiva";
};

export type UsuarioEtiquetaRow = {
  id_usuario: number;
  id_etiqueta: number;
  asignado_por: number | null;
  fecha_asignacion: MySqlDateTime;
};

export type GrupoRow = {
  id_grupo: number;
  nombre: string;
  descripcion: string | null;
  visibilidad: GroupVisibility;
  fecha_creacion: MySqlDateTime;
};

export type ModuloRow = {
  id_modulo: number;
  id_propietario: number;
  id_grupo: number | null;
  visibilidad: ModuleVisibility;
  fecha_modificacion: MySqlDateTime | null;
  modificado_por: number | null;
};

export type SensorRow = {
  id_sensor: number;
  id_modulo: number;
  tipo: string;
};

export type VisualizacionRow = {
  id_visualizacion: number;
  id_sensor: number;
  id_usuario: number;
  tipo: string;
  configuracion: MySqlJson;
  fecha_creacion: MySqlDateTime;
  fecha_modificacion: MySqlDateTime | null;
};

export type SolicitudRow = {
  id_solicitud: number;
  id_solicitante: number;
  id_responsable: number | null;
  tipo: RequestType;
  id_modulo: number | null;
  id_grupo: number | null;
  rol_solicitado: GroupRole | null;
  nivel_acceso_solicitado: AccessLevel | null;
  estado: RequestStatus;
  fecha_creacion: MySqlDateTime;
  fecha_resolucion: MySqlDateTime | null;
  justificacion_solicitante: string | null;
  respuesta_resolucion: string | null;
};

export type GrupoUsuarioRow = {
  id_grupo_usuarios: number;
  id_usuario: number;
  id_grupo: number;
  id_solicitud_origen: number | null;
  estado: MembershipStatus;
  rol_grupo: GroupRole;
  fecha_ingreso: MySqlDateTime;
  fecha_modificacion: MySqlDateTime | null;
};

export type AccesoRow = {
  id_acceso: number;
  id_modulo: number;
  id_usuario: number;
  id_solicitud: number | null;
  nivel_acceso: AccessLevel;
  estado: AccessStatus;
  concedido_por: number | null;
  fecha_concesion: MySqlDateTime;
  fecha_expiracion: MySqlDateTime | null;
  revocado_por: number | null;
  fecha_revocacion: MySqlDateTime | null;
  motivo_revocacion: string | null;
  vigente_flag: 1 | null;
};

export type AuditoriaRow = {
  id_auditoria: number;
  entidad: string;
  entidad_id: number;
  accion: "INSERT" | "UPDATE" | "DELETE";
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  usuario_id: number | null;
  id_grupo_contexto: number | null;
  fecha: MySqlDateTime;
};

export type BioRedTables = {
  usuarios: UsuarioRow[];
  etiquetas: EtiquetaRow[];
  usuario_etiquetas: UsuarioEtiquetaRow[];
  grupos: GrupoRow[];
  modulos: ModuloRow[];
  sensores: SensorRow[];
  visualizacion: VisualizacionRow[];
  solicitudes: SolicitudRow[];
  grupo_usuarios: GrupoUsuarioRow[];
  accesos: AccesoRow[];
  auditorias: AuditoriaRow[];
};
