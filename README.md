# VECT Frontend

Aplicación web para la plataforma VECT de gestión de incidencias, soporte técnico, usuarios, conversaciones, activos e inventario. Está construida con React, TypeScript y Vite, y consume la API REST del backend VECT.

## Contenido

- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación y desarrollo local](#instalación-y-desarrollo-local)
- [Configuración de la API](#configuración-de-la-api)
- [Despliegue en Render](#despliegue-en-render)
- [Módulos](#módulos)
- [Autenticación y permisos](#autenticación-y-permisos)
- [Validación](#validación)
- [Archivos en conversaciones](#archivos-en-conversaciones)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Trabajo por áreas](#trabajo-por-áreas)

## Tecnologías

- React 19 y TypeScript 6.
- Vite 8 para desarrollo y compilación.
- React Router para navegación.
- Tailwind CSS 4 para estilos.
- Recharts para visualizaciones.
- pnpm y `pnpm-lock.yaml` para gestionar dependencias.

## Requisitos

- Node.js compatible con Vite 8.
- pnpm.
- El backend VECT en ejecución para iniciar sesión y probar operaciones que consultan datos.

## Instalación y desarrollo local

Desde la carpeta del frontend:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre la URL local que muestra Vite, normalmente <http://localhost:5173>. El backend debe estar disponible en `http://localhost:8080`.

Para instalar pnpm si aún no está disponible:

```sh
corepack enable
corepack prepare pnpm@latest --activate
```

## Configuración de la API

El cliente HTTP está en `src/lib/api/client.ts`. Lee `VITE_API_BASE_URL` y, si no existe, usa `http://localhost:8080/api`.

Para cambiar el destino local, crea `.env.local` en la raíz del frontend usando `.env.example` como referencia:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

La URL debe terminar en `/api`, sin una barra adicional al final. Reinicia Vite después de cambiar una variable de entorno.

El frontend llama a la API directamente desde el navegador; Vite no configura un proxy. Por eso, el backend debe permitir el origen del frontend en CORS, por ejemplo `http://localhost:5173` en desarrollo.

Las variables con prefijo `VITE_` se incorporan al JavaScript público del navegador. La URL de la API puede configurarse de esta manera, pero nunca incluyas contraseñas, tokens, claves privadas ni otros secretos.

## Despliegue en Render

Puedes publicar este proyecto como un sitio estático:

1. Crea un **Static Site** conectado al repositorio del frontend.
2. Establece la raíz del proyecto en la carpeta del frontend (si el repositorio contiene solo el frontend, deja la raíz vacía).
3. Usa estos comandos:

   - **Build Command:** `pnpm install --frozen-lockfile && pnpm build`
   - **Publish Directory:** `dist`

4. En **Environment**, define `VITE_API_BASE_URL` con la URL pública del backend, incluyendo `/api`, por ejemplo:

   ```text
   https://tu-backend.onrender.com/api
   ```

5. Despliega el sitio.
6. En la configuración CORS del backend, permite el origen HTTPS del sitio estático de Render (por ejemplo, `https://tu-frontend.onrender.com`).
7. Si el sitio usa rutas de React Router, añade una regla de reescritura para que las rutas de la aplicación devuelvan `index.html`:

   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`

Vite lee `VITE_API_BASE_URL` durante el build. Si la cambias, vuelve a desplegar el frontend para que se genere un bundle actualizado. La URL no es secreta y será visible para los usuarios del sitio.

## Módulos

| Área | Funcionalidad |
| --- | --- |
| Resumen | Indicadores de incidencias, inventario y solicitudes. |
| Incidencias | Consulta, registro, asignación, estados y actividad. |
| Solicitudes | Solicitudes de cambio y aprobaciones. |
| Mensajes | Conversaciones y chat. |
| Historial | Historial de incidencias, aprobaciones, chats y evidencias. |
| Activos e inventario | Activos, componentes y existencias. |
| Usuarios y equipo TI | Consulta y gestión de usuarios según los permisos del backend. |
| Administración | Catálogos, ubicaciones, auditoría, parámetros y automatización. |
| Reportes | Información operativa y reportes de la API. |

La visibilidad de las opciones de navegación depende del rol autenticado.

## Autenticación y permisos

- Inicia sesión con una cuenta existente en el backend VECT.
- Los tokens de sesión se mantienen en `sessionStorage` del navegador.
- La interfaz filtra la navegación según el rol, pero la autorización definitiva siempre corresponde al backend.
- No uses este filtro visual como sustituto de permisos en la API.

## Validación

```sh
pnpm lint
pnpm build
pnpm preview
```

`pnpm build` ejecuta primero la comprobación de TypeScript y luego genera el sitio de producción en `dist/`. `pnpm preview` sirve esa compilación localmente.

## Archivos en conversaciones

El chat permite adjuntar imágenes, PDF, documentos de Word, Excel y PowerPoint, y archivos de texto de hasta 8 MB. El backend debe tener aplicada la migración `20261001_conversation_attachments.sql` antes de habilitar esta función.

Los adjuntos se almacenan mediante Cloudinary desde el backend. No se necesitan credenciales de Cloudinary en el frontend. El backend administra las carpetas de adjuntos automáticamente.

## Estructura del proyecto

```text
src/
├── app/          Rutas de la aplicación y navegación por rol
├── components/   Componentes de interfaz reutilizables
├── features/     Funcionalidades agrupadas por módulo
├── hooks/        Hooks compartidos
├── layouts/      Estructura visual de las páginas
├── lib/api/      Cliente HTTP y manejo de respuestas
├── types/        Tipos de la API y del frontend
└── utils/        Formato y utilidades generales
```

## Trabajo por áreas

La carpeta `avances/` contiene una base común y entregas parciales por responsabilidad. Las carpetas de persona no son proyectos independientes ni se compilan por separado.

- `avances/compartido/`: configuración, navegación, layout, cliente API y demás componentes compartidos.
- `avances/persona1/`: autenticación y usuarios.
- `avances/persona2/`: incidencias, chat, mensajes e historial.
- `avances/persona3/`: activos, inventario, administración, catálogos, dashboard, reportes y solicitudes.

Para integrar el trabajo, conserva la base completa del frontend y combina únicamente las features asignadas bajo `src/features/`. Coordina antes los cambios a `src/app/App.tsx`, `src/app/navigation.ts`, al cliente API, a los tipos compartidos y a los componentes comunes.
