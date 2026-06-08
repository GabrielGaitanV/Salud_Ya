# SaludYa

**MVP de gestión y reserva de citas médicas para consultorios pequeños.**

Aplicación web fullstack construida sobre Node.js + Express + EJS, con persistencia simplificada en un archivo `datos.json` local. Diseñada como proyecto universitario para demostrar un MVP funcional con autenticación, sesiones, agendamiento de citas y suite de pruebas automatizadas.

---

## Características

- 🔐 **Registro e inicio de sesión** con contraseñas hasheadas (bcrypt).
- 🧾 **Sesiones persistentes** con `express-session` (cookies httpOnly, 8h de duración).
- 📅 **Agendamiento de citas**: crear, listar y cancelar — cada usuario solo ve y gestiona las suyas.
- 🛡️ **Rutas protegidas** vía middleware `requiereAuth`.
- 💬 **Mensajes flash** (errores y confirmaciones) entre peticiones.
- 🎨 **UI Kit corporativo** con paleta de colores, tipografía Inter, Lucide Icons y soporte de **modo oscuro** persistente en `localStorage`.
- 🧪 **Suite de pruebas** unitarias (Jest) y de integración (Supertest) sin tocar `datos.json`.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js |
| Framework HTTP | Express 4 |
| Motor de plantillas | EJS |
| Sesiones | express-session |
| Hashing de contraseñas | bcryptjs |
| Persistencia | Archivo JSON local (`datos.json`) |
| Tests unitarios | Jest |
| Tests de integración | Supertest |
| Iconos | Lucide Icons (CDN) |
| Tipografía | Google Fonts — Inter |

---

## Requisitos previos

- **Node.js** ≥ 18
- **npm** ≥ 9

---

## Instalación

```bash
git clone <url-del-repo>
cd SaludYa
npm install
```

Esto instala las dependencias de producción (`express`, `ejs`, `express-session`, `bcryptjs`) y de desarrollo (`jest`, `supertest`).

---

## Ejecución

```bash
# Modo desarrollo / producción (mismo comando para MVP)
npm start
```

El servidor escucha en `http://localhost:3000`. La ruta raíz redirige automáticamente a `/login` o a `/dashboard` según el estado de sesión.

### Variables de entorno opcionales

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto de escucha del servidor |
| `SESSION_SECRET` | `saludya-mvp-dev-secret` | Secreto para firmar cookies de sesión (cambiarlo en producción) |
| `NODE_ENV` | — | Si vale `test`, `server.js` no llama a `app.listen()` |

---

## Pruebas

```bash
npm test            # corre toda la suite una vez
npm run test:watch  # modo watch
```

La suite incluye **22 tests** distribuidos en 3 archivos:

- **`__tests__/auth.unit.test.js`** — unitarias sobre `lib/auth.js`.
- **`__tests__/citas.unit.test.js`** — unitarias sobre `lib/citas.js`.
- **`__tests__/server.integration.test.js`** — integración HTTP con Supertest.

Todas las pruebas mockean `lib/db` con `jest.mock`, por lo que **el `datos.json` real nunca se modifica al correr los tests**.

Detalle completo de cada caso en [PRUEBAS.md](PRUEBAS.md).

---

## Estructura del proyecto

```
SaludYa/
├── __tests__/                      # Suite de pruebas
│   ├── jest.setup.js               # Fija NODE_ENV=test
│   ├── auth.unit.test.js           # Unitarias de autenticación
│   ├── citas.unit.test.js          # Unitarias de citas
│   └── server.integration.test.js  # Integración HTTP
│
├── lib/                            # Lógica de dominio (testeable)
│   ├── db.js                       # Capa de persistencia (lee/escribe datos.json)
│   ├── auth.js                     # Registro y autenticación
│   └── citas.js                    # CRUD de citas por usuario
│
├── public/                         # Archivos estáticos
│   └── style.css                   # UI Kit completo (variables, componentes, dark-mode)
│
├── views/                          # Plantillas EJS
│   ├── login.ejs
│   ├── registro.ejs
│   └── dashboard.ejs
│
├── datos.json                      # "Base de datos" simulada
├── server.js                       # Punto de entrada Express
├── package.json
├── PRUEBAS.md                      # Documentación del plan de pruebas
└── README.md                       # Este archivo
```

---

## Arquitectura

La aplicación sigue una separación clara en tres capas:

```
┌─────────────────────────────────────────┐
│   server.js (rutas Express + sesiones)  │  ← capa HTTP
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  lib/auth.js  ·  lib/citas.js           │  ← lógica de dominio
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│        lib/db.js (lee/escribe JSON)     │  ← persistencia
└─────────────────────────────────────────┘
                  │
                  ▼
                datos.json
```

**Beneficios de esta separación:**
- La lógica de dominio (`auth.js`, `citas.js`) no depende de Express, por lo que se puede probar de forma unitaria sin levantar el servidor.
- Mockear `lib/db.js` aísla las pruebas del sistema de archivos.
- Cambiar `datos.json` por una base de datos real (Postgres, MongoDB) solo requeriría reescribir `lib/db.js`.

---

## Modelo de datos

Archivo `datos.json`:

```json
{
  "usuarios": [
    {
      "id": "k7x2a1b3",
      "fullname": "Juan Pérez",
      "email": "juan@correo.com",
      "phone": "300...",
      "passwordHash": "$2a$10$...",
      "creadoEn": "2026-06-07T12:00:00.000Z"
    }
  ],
  "citas": [
    {
      "id": "k7x2a1b4",
      "usuarioId": "k7x2a1b3",
      "medico": "Dr. Carlos López",
      "especialidad": "Cardiología",
      "fecha": "2026-07-15",
      "hora": "10:30",
      "ubicacion": "Hospital Central, Sala 302",
      "estado": "pendiente",
      "creadaEn": "2026-06-07T12:05:00.000Z"
    }
  ]
}
```

**Notas:**
- `passwordHash` se genera con bcrypt (10 rondas) — el password plano nunca se almacena.
- `email` se normaliza a minúsculas antes de guardar y al comparar.
- `usuarioId` en `citas` establece la relación 1:N con `usuarios`.

---

## Rutas HTTP

### Públicas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/` | Redirige a `/login` o `/dashboard` según sesión |
| `GET` | `/login` | Renderiza formulario de inicio de sesión |
| `POST` | `/login` | Autentica y crea sesión |
| `GET` | `/registro` | Renderiza formulario de registro |
| `POST` | `/registro` | Valida y crea un nuevo usuario |

### Protegidas (requieren sesión activa)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/dashboard` | Panel con info del usuario + lista de citas |
| `POST` | `/citas` | Crea una nueva cita asociada al usuario |
| `POST` | `/citas/:id/cancelar` | Elimina una cita propia |
| `POST` | `/logout` | Destruye la sesión |

Cualquier petición sin sesión a una ruta protegida responde **302 → `/login`**.

---

## Sistema de diseño (UI Kit)

Definido en [public/style.css](public/style.css) mediante variables CSS.

### Paleta de colores

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#0D7EA3` | Botones principales, enlaces, marca |
| `--primary-dark` | `#055A7E` | Hover de primarios |
| `--success` | `#059669` | Confirmaciones, mensajes positivos |
| `--error` | `#DC2626` | Errores y validaciones |
| `--bg-color` | `#FAFBFC` | Fondo general |
| `--surface` | `#FFFFFF` | Tarjetas y formularios |
| `--text-main` | `#1F2937` | Texto principal |
| `--text-muted` | `#6B7280` | Texto secundario |
| `--border` | `#E5E7EB` | Bordes |

### Modo oscuro

Se activa agregando la clase `.dark-mode` al `<body>`. Cada vista incluye un botón flotante 🌙/☀️ en la esquina superior derecha que alterna el modo y persiste la preferencia en `localStorage`.

### Componentes principales

- `.btn` (variantes: `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-danger`)
- `.card` con `.card-header`, `.card-body`, `.card-footer`
- `.form-group`, `.form-label`, `.form-control`
- `.alert` (`.alert-success`, `.alert-error`, `.alert-warning`)
- `.navbar`, `.dashboard-grid`, `.info-row`

---

## Seguridad

- **Contraseñas hasheadas** con bcrypt (10 rondas) — nunca en texto plano.
- **Cookies de sesión `httpOnly`** — no accesibles desde JavaScript del cliente.
- **Validación de propiedad** en cancelación de citas: un usuario solo puede borrar las suyas (verificado por `usuarioId`).
- **Comparación de email case-insensitive** para evitar registros duplicados con variantes de mayúsculas.
- **`SESSION_SECRET` configurable** vía variable de entorno (cambiar el valor por defecto en producción).

