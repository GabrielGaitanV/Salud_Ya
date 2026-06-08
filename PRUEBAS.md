# Plan de Pruebas — SaludYa

Este documento describe las pruebas automatizadas implementadas en el proyecto, qué se espera de cada una y cómo ejecutarlas.

## Stack de pruebas

- **Jest** — framework de pruebas unitarias y de integración.
- **Supertest** — cliente HTTP para probar el servidor Express sin abrir puertos reales.
- **Mocks de `lib/db`** — todas las pruebas mockean la capa de persistencia, por lo que **no se modifica el archivo `datos.json` real**.

## Cómo ejecutar

Desde la raíz del proyecto:

```bash
# Instalar dependencias (solo la primera vez)
npm install

# Ejecutar toda la suite una vez
npm test

# Ejecutar en modo watch (re-ejecuta al guardar cambios)
npm run test:watch
```

### Notas de configuración

- `NODE_ENV=test` se fija automáticamente desde `__tests__/jest.setup.js`.
- En entorno de pruebas, `server.js` exporta la `app` sin llamar a `app.listen()`, evitando puertos colgados.
- Los tests corren con `--runInBand` (en serie) para evitar condiciones de carrera sobre los mocks compartidos.

---

## Suite 1 — Unitarias de autenticación

**Archivo:** `__tests__/auth.unit.test.js`
**Módulo bajo prueba:** `lib/auth.js`
**Estrategia:** `jest.mock('../lib/db')` para sustituir `leerDatos`, `guardarDatos` y `generarId` por funciones controladas en memoria.

### `registrarUsuario`

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Faltan campos obligatorios (ej. `fullname` vacío) | `{ ok: false, error: /obligatorios/ }`. `guardarDatos` no debe llamarse. |
| 2 | Contraseña con menos de 6 caracteres | `{ ok: false, error: /6 caracteres/ }`. No se guarda. |
| 3 | Registro válido | `{ ok: true }`, el usuario devuelto **no contiene `passwordHash`**, el email queda en minúsculas, el nombre con `trim()`, y el `passwordHash` persistido es distinto al password plano (hash con bcrypt). |
| 4 | Email duplicado case-insensitive (`ANA@` vs `ana@`) | `{ ok: false, error: /ya existe/ }`. `guardarDatos` no se llama por segunda vez. |

### `autenticarUsuario`

| # | Caso | Resultado esperado |
|---|---|---|
| 5 | Credenciales válidas | `{ ok: true }`, el usuario devuelto omite `passwordHash`. |
| 6 | Contraseña incorrecta | `{ ok: false, error: /credenciales/ }`. |
| 7 | Email inexistente | `{ ok: false }`. |
| 8 | Faltan campos (`email` o `password` vacíos) | `{ ok: false, error: /obligatorios/ }`. |

---

## Suite 2 — Unitarias de citas

**Archivo:** `__tests__/citas.unit.test.js`
**Módulo bajo prueba:** `lib/citas.js`
**Estrategia:** mismo enfoque, mockeando `lib/db` y generando IDs deterministas.

| # | Función | Caso | Resultado esperado |
|---|---|---|---|
| 1 | `crearCita` | Faltan campos obligatorios | `{ ok: false }` y `guardarDatos` no se llama. |
| 2 | `crearCita` | Datos válidos | Se persiste una cita con `usuarioId` correcto y `estado: 'pendiente'`. |
| 3 | `listarCitasPorUsuario` | Hay citas de varios usuarios | Devuelve **solo** las del usuario indicado, **ordenadas ascendentemente por fecha**. |
| 4 | `cancelarCita` | Cita ajena (otro `usuarioId`) | `{ ok: false }`, la cita sigue existiendo. Si el `usuarioId` coincide, se elimina y devuelve `{ ok: true }`. |

---

## Suite 3 — Integración HTTP

**Archivo:** `__tests__/server.integration.test.js`
**Bajo prueba:** rutas Express de `server.js` con sesiones reales (`express-session`).
**Estrategia:** Supertest contra la `app` exportada; `lib/db` mockeado para mantener estado en memoria. Para el flujo autenticado se usa `request.agent(app)` que persiste la cookie de sesión entre peticiones.

### Protección de rutas privadas

| # | Petición | Resultado esperado |
|---|---|---|
| 1 | `GET /dashboard` sin sesión | **302** con `Location: /login` *(caso explícito de la rúbrica)*. |
| 2 | `GET /` sin sesión | 302 → `/login`. |
| 3 | `POST /citas` sin sesión | 302 → `/login`, sin crear cita. |

### Vistas públicas

| # | Petición | Resultado esperado |
|---|---|---|
| 4 | `GET /login` | 200, HTML contiene "Iniciar Sesión" y `action="/login"`. |
| 5 | `GET /registro` | 200, HTML contiene "Crear Cuenta". |

### Registro y login

| # | Petición | Resultado esperado |
|---|---|---|
| 6 | `POST /registro` con datos válidos y contraseñas coincidentes | 302 → `/login`. El usuario queda persistido en la base mockeada. |
| 7 | `POST /registro` con contraseñas distintas | 302 → `/registro`. No se crea usuario. |
| 8 | `POST /login` con credenciales inexistentes | 302 → `/login`. |

### Flujo end-to-end autenticado

| # | Escenario | Resultado esperado |
|---|---|---|
| 9 | Registro → login → `GET /dashboard` (mismo `agent`) | Tras login, redirección 302 → `/dashboard`. El `GET /dashboard` posterior responde **200** y el HTML contiene `"Bienvenido, <nombre>"`. |
| 10 | Usuario autenticado hace `POST /citas` con datos válidos | 302 → `/dashboard`. La cita queda persistida con el `medico` enviado y asociada al usuario logueado. |

---

## Cobertura respecto a la rúbrica

| Requisito de la rúbrica | Cubierto por |
|---|---|
| Pruebas Unitarias | Suite 1 (`auth.unit.test.js`) + Suite 2 (`citas.unit.test.js`) |
| Pruebas de Integración | Suite 3 (`server.integration.test.js`) |
| Aislamiento de la base de datos simulada | Mock de `lib/db` en todas las suites — `datos.json` nunca se modifica al correr `npm test`. |
| Librería sencilla (Jest) | Configurada vía bloque `jest` en `package.json`. |

---

## Estructura de archivos relevantes

```
SaludYa/
├── __tests__/
│   ├── jest.setup.js              # Fija NODE_ENV=test
│   ├── auth.unit.test.js          # Suite 1
│   ├── citas.unit.test.js         # Suite 2
│   └── server.integration.test.js # Suite 3
├── lib/
│   ├── db.js                      # Mockeado en pruebas
│   ├── auth.js
│   └── citas.js
├── server.js                      # Exporta `app`; sólo escucha si NODE_ENV !== 'test'
└── package.json                   # Scripts test / test:watch + config de jest
```
