# BioRed · Next.js + Tailwind CSS (rem)

Interfaz BioRed con autenticación y gobernanza persistidas en MySQL.

## Puesta en marcha

Requisitos: Node.js 20.9 o posterior y MySQL 8.0.16 o posterior.

1. Crea una base de datos vacía y un usuario MySQL para la aplicación.
2. Copia `.env.example` a `.env.local` y completa las credenciales de conexión.
3. Aplica el esquema de BioRed en la base de datos vacía y después ejecuta
   `database/migrations/001-create-sesiones-app.sql`.
   El [script original del esquema](https://github.com/AngelPrz8a/BioRed_BD/blob/0d6e2cddf78d5ff702cf7f638fd51349d4b8c59f/crear_bd_v2.sql)
   contiene una instrucción que elimina y recrea la base de datos: no lo ejecutes sin revisarlo
   y retirar esa instrucción. No uses una base que contenga datos que deban conservarse.
4. Instala dependencias y crea el primer administrador desde una terminal interactiva:

   ```bash
   npm install
   npm run bootstrap:admin
   npm run dev
   ```

El bootstrap pide el nombre, correo y contraseña sin mostrarla. Solo crea la primera cuenta
administradora si no hay ya un administrador activo. No carga cuentas de demostración.

Las variables requeridas son `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD` y `MYSQL_DATABASE`.
`MYSQL_PORT` (3306), `MYSQL_CONNECTION_LIMIT` (10) y `MYSQL_SSL` (`false`) son opcionales.
El proceso de bootstrap carga `.env.local`; Next.js carga ese mismo archivo para la aplicación.

Los archivos de datos locales preexistentes en `.biored` se conservan, pero la aplicación ya no
los lee ni escribe. La fuente de datos es MySQL. La tabla actual de BioRed no incluye lecturas
históricas de sensores, por lo que la interfaz no inventa valores de telemetría.

## Rutas principales

| Rol | Ruta base |
| --- | --- |
| Explorar público | `/` |
| Usuario autenticado | `/espacio` |
| Coordinador de grupo | `/coordinador` |
| Administrador global | `/admin` |

Las áreas privadas validan la cookie y los permisos en el servidor; escribir otra ruta no cambia
el rol. Los usuarios nuevos reciben el rol global `usuario`. El rol de coordinador se deriva de una
membresía activa en `grupo_usuarios`; el rol global `administrador` no se puede escoger desde el
registro.

`POST /api/auth/register`, `POST /api/auth/login` y `POST /api/auth/logout` gestionan el acceso.
Las rutas de gobernanza requieren administrador y registran los cambios en `auditorias`.

## Estructura

```text
src/
  app/                         rutas públicas y áreas por rol
  components/layout/           header, sidebar, navegación y footer
  lib/navigation.ts            menús, textos y usuario de cada rol
  lib/server/auth-store.ts     autenticación y gobernanza MySQL
  lib/server/mysql.ts          pool, consultas y transacciones MySQL
database/migrations/           migraciones SQL de la aplicación
```

## Convención de unidades

Todo en rem (1rem = 16px). La escala de Tailwind ya es rem (`--spacing: 0.25rem`),
así que `px del diseño ÷ 4` = número de la utilidad: 230px → `w-57.5`, 41px → `size-10.25`.
Los tamaños de texto del diseño que no existen en Tailwind son tokens en `globals.css`:
`text-micro` (10px), `text-caption` (11px), `text-label` (13px), `text-brand` (25px).
Solo quedan en px los bordes de 1px.
