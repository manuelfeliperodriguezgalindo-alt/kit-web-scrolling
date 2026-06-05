# Configuración técnica de Firebase — Reina María IPS

> **v4 — Aprobación manual de usuarios + workflow estafeta + Plan B sin Storage**
> Para el contexto general del proyecto, leer [`../CLAUDE.md`](../CLAUDE.md).

---

## 1. Archivos clave

| Archivo | Función |
|---|---|
| `firebase-config.js` | Credenciales + constantes (ROLES, ESTADOS_EXPEDIENTE, TIPOS_DOCUMENTO) + `getNextFolio()` atómico + `rolToDashboard()` |
| `auth-helper.js` | Cache local del rol en `localStorage` (TTL 30 min) con refresh en background. Optimiza tiempo de carga. |
| `email-gate.js` | Pantalla bloqueante de verificación de correo (inyecta overlay si `!user.emailVerified`). |
| `seed-catalogos.js` | Script de inicialización de catálogos (57 recomendaciones + 10 laboratorios). |

---

## 2. Modelo de roles (5 roles, v4)

| Rol | Función |
|---|---|
| `pendiente` | Recién registrado, bloqueado por reglas. Pantalla `cuenta-pendiente.html`. |
| `secretaria` | Apertura de expedientes, cierre del proceso. |
| `medico` | Llena exámenes técnicos + consulta médica + puede reabrir folios. |
| `empresa` | Solo lee conceptos A-5 de su empresa cliente. |
| `admin` | Acceso total. Único que cambia roles. |

> No usamos invitaciones por correo (intentado dos veces, fallido). El registro es abierto y el admin aprueba manualmente desde `/usuarios`.

---

## 3. Flujo de activación inicial

### 3.1 Authentication
1. **Authentication → Sign-in method** → activar **Correo electrónico/contraseña**.
2. **Authentication → Settings → Authorized domains** → añadir:
   - `reinamariaips.com`
   - `www.reinamariaips.com`
   - `localhost` (para pruebas)
3. **Authentication → Templates** → personalizar al español.

### 3.2 Firestore Database
1. **Firestore Database → Crear** (modo producción).
2. **Región recomendada**: `southamerica-east1` (São Paulo, baja latencia desde Colombia). *Si está en `us-central1`, las queries añaden ~150ms; se puede vivir con eso.*
3. **Reglas**: pegar contenido de [`../firestore.rules`](../firestore.rules) → **Publicar**.

### 3.3 Cloud Storage (NO activado en Plan B)
- El proyecto funciona sin Storage. Los adjuntos guardan solo metadatos en Firestore con link externo opcional (Drive/Dropbox).
- Si se decide activar después: requiere Plan Blaze + tarjeta. Las reglas están preparadas en `../storage.rules`.

### 3.4 Sembrar catálogos
Una vez con sesión admin:
```js
// Desde DevTools → Console del dashboard:
import('./js/seed-catalogos.js').then(m => m.sembrarCatalogos());
```
Carga 57 recomendaciones agrupadas + 10 laboratorios estándar.

---

## 4. Cómo promover el primer admin

Como no existe ningún admin al inicio, hay dos caminos:

### Camino A — Manual desde Firestore Console
1. Registrarse normalmente desde `/portal` (queda como `pendiente`).
2. Firebase Console → Firestore → `users/{uid}` → editar `rol`: `"pendiente"` → `"admin"`.
3. Cerrar sesión y volver a entrar.

### Camino B — Crear todo en Console manualmente
1. **Authentication → Users → Add user** → email + password.
2. Copiar el UID.
3. Firestore → `users/{uid}` → crear con campos:
   ```json
   {
     "uid": "...",
     "rol": "admin",
     "email": "...",
     "nombres": "...",
     "apellidos": "...",
     "tipo_documento": "CC",
     "numero_documento": "...",
     "createdAt": <timestamp>,
     "updatedAt": <timestamp>
   }
   ```

---

## 5. Sistema de folios

**Formato**: `TIPO-YYYYMM-NNNN` (atómico por mes).

```js
import { TIPOS_DOCUMENTO, getNextFolio } from './firebase-config.js';
const folio = await getNextFolio(TIPOS_DOCUMENTO.AUDIOMETRIA, db);
// → "AUD-202605-0001"
```

El contador vive en `counters/{TIPO_YYYYMM}` con `{ valor, tipo, periodo, updatedAt }`. Usa `runTransaction` para evitar colisiones.

---

## 6. Cache local de rol (optimización)

`auth-helper.js` mantiene en `localStorage` el doc completo de `users/{uid}` con TTL de 30 minutos.

```js
import { getUserData } from './js/auth-helper.js';
const { data, isStale } = await getUserData(db, user.uid);
// data: contiene el rol y datos del user (instantáneo)
// isStale: true si vino del cache (se está refrescando en background)
```

Si el rol cambia (admin promueve/degrada), el refresh en background detecta el cambio y hace `window.location.reload()` automáticamente.

**Limpieza**: cualquier `handleLogout()` borra `rmips_user_cache_v1` de localStorage.

---

## 7. Optimizaciones de carga aplicadas

| Optimización | Archivos afectados |
|---|---|
| Cache local del rol | `auth-helper.js`, `dashboard-empleado.html`, `dashboard-empresa.html` |
| `<link rel="modulepreload">` del SDK Firebase | `portal.html`, dashboards, formularios |
| `<link rel="prefetch">` de páginas siguientes | Dashboard prefetch a expedientes/forms; cada form prefetch a expediente |

Resultado: navegación entre páginas ~50% más rápida (de ~1.6s a ~0.7-0.9s).

---

## 8. Estructura de Firestore (resumen)

```
users/{uid}                          ← roles
expedientes/{EXP-YYYYMM-NNNN}        ← carpeta de visita
historias_clinicas/{HCO-...}
audiometrias/{AUD-...}
visiometrias/{VIS-...}
optometrias/{OPT-...}
conceptos_aptitud/{CAP-...}          ← visible a empresa
adjuntos/{ADJ-...}                   ← solo metadatos (Plan B)
empresas/{id}                        ← empresas cliente
pacientes/{id}                       ← registros (futuro CRUD)
counters/{TIPO_YYYYMM}               ← contador atómico de folios
catalogos/recomendaciones/items/{id}
catalogos/laboratorios/items/{id}
config/{docId}                       ← config global IPS
```

Modelo completo y reglas detalladas en [`../firestore.rules`](../firestore.rules).

---

## 9. Si algo se rompe

- Ver tabla de troubleshooting en [`../CLAUDE.md`](../CLAUDE.md) sección "Si algo falla en producción".
- El error genérico "Ocurrió un error" probablemente significa `permission-denied` (reglas no publicadas) o `auth/operation-not-allowed` (Email/Password no activado).
- `translateError()` en `portal.html` ahora muestra el código real cuando no lo reconoce, así que las páginas siempre muestran información útil.
