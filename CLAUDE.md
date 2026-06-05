# Reina María IPS — Plataforma digital

> **Este archivo es la fuente de verdad del estado del proyecto.**
> Si la conversación con Claude se compacta, este archivo conserva todo lo necesario para continuar sin errores.

---

## 🏥 ¿Qué es este proyecto?

Plataforma web para **Reina María IPS** (Carrera 16 #14-54, Duitama, Boyacá, Colombia), una Institución Prestadora de Servicios de Salud especializada en **salud ocupacional**.

La plataforma sirve a 4 públicos:
1. **Pacientes**: solo ven el sitio público; NO tienen portal propio.
2. **Personal interno** (secretaria, médicos): gestiona expedientes clínicos.
3. **Empresas cliente**: coordinadores SST ven solo los conceptos de aptitud de sus trabajadores.
4. **Administrador**: dueño de la IPS + desarrollador.

---

## 🧱 Stack técnico

- **Hosting**: Netlify (free tier, dominio `reinamariaips.com`)
- **Auth**: Firebase Authentication (Email/Password + verificación obligatoria)
- **Base de datos**: Firebase Firestore (región actual: la que esté configurada, ver `js/firebase-config.js`)
- **Cloud Storage**: **ACTIVADO** (v5 — Plan Blaze). Usado para foto del paciente, firma del paciente, firma del médico, PDFs del CAP y adjuntos externos.
- **Cloud Functions**: NO activado
- **Frontend**: HTML estático + JS vanilla (módulos ES6), sin build step
- **Plan Firebase**: Blaze (pago por uso). El free tier de Blaze cubre prácticamente todo el uso esperado de una IPS pequeña.
- **PDF**: generado en cliente con `jsPDF` + `html2canvas` (CDN), subido a Storage como artefacto persistente.

---

## 👥 Modelo de roles (5 roles)

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| `pendiente` | Recién registrado, sin aprobar | Solo ver pantalla de espera |
| `secretaria` | Recepción de la IPS | Abre expedientes, captura datos básicos + **foto + firma del paciente**, cierra el proceso, registra usuarios |
| `medico` | Personal clínico (1+ médicos) | Llena exámenes técnicos y consulta médica. **Sube su firma una vez** en su perfil (se reusa en cada CAP). **Puede reabrir folios cerrados** |
| `empresa` | Coordinador SST de empresa cliente | Solo lee conceptos de aptitud (CAP) de SUS trabajadores. Nunca historias clínicas. Nunca pacientes PARTICULAR. **Puede descargar el PDF del CAP** desde Storage. |
| `admin` | Dueño IPS + desarrollador | Acceso total. Único que aprueba/cambia roles. |

**Flujo de aprobación**:
1. Cualquiera se registra desde `/portal` → queda con rol `pendiente`.
2. Sistema lo redirige a `cuenta-pendiente.html` (pantalla bloqueante).
3. Admin entra a `/usuarios` → ve listado con badge de pendientes → click "Aprobar" → asigna rol.
4. Usuario aprueba → recarga → entra al dashboard que le corresponde.

> **NO usamos invitaciones por correo.** El registro es abierto, la aprobación es manual. Esto se decidió tras varios intentos fallidos con invitaciones (problemas de reglas Firestore en cascada).

---

## 📋 Workflow del expediente (estafeta)

Cada visita del paciente sigue 4 estados:

```
RECEPCIÓN → EXÁMENES → REVISIÓN → CERRADO
  secretaria   médico/s   médico     secretaria cierra
  abre folio   llenan      marca     bloqueo legal
  + foto+firma exámenes    listo     (médico/admin reabren)
  + datos                            + se genera PDF del CAP
```

- **Bloqueo legal**: cuando `estado === 'cerrado'` y `bloqueado === true`, nadie edita. Médico/admin pueden reabrirlo (cambian a `examenes`) dejando rastro en `log_actividad`.
- **El cierre lo hace la SECRETARIA**, no el médico.
- **El PDF del CAP** queda en `Storage: cap-pdfs/{folio}.pdf` y persiste aunque el expediente cierre. La URL queda guardada en `conceptos_aptitud/{folio}.pdf_url`.

---

## 🔢 Sistema de folios

Formato: **`TIPO-YYYYMM-NNNN`** (consecutivo atómico por tipo y mes).

| Tipo | Prefijo | Ejemplo |
|---|---|---|
| Expediente (carpeta de visita) | `EXP` | `EXP-202605-0001` |
| Historia Clínica Ocupacional | `HCO` | `HCO-202605-0001` |
| Concepto de Aptitud | `CAP` | `CAP-202605-0001` |
| Audiometría | `AUD` | `AUD-202605-0001` |
| Visiometría | `VIS` | `VIS-202605-0001` |
| Optometría | `OPT` | `OPT-202605-0001` |
| Adjunto externo | `ADJ` | `ADJ-202605-0001` |

Generación: `getNextFolio(tipo, db)` en `js/firebase-config.js` usa `runTransaction` para incrementar atómicamente el contador en `counters/{TIPO_YYYYMM}`.

**El folio del expediente ES el ID del documento Firestore**. Los exámenes referencian `expediente_id` con el folio EXP del padre.

---

## 🗄️ Modelo de datos (Firestore + Storage)

### Firestore

```
pacientes/{numero_documento}          ← ENTIDAD MAESTRA (v5)
  numero_documento, tipo_documento,
  nombres, apellidos, fecha_nacimiento, sexo,
  telefono, direccion,
  ciudad_residencia, ciudad_nacimiento, ciudad_expedicion,
  lugar_nacimiento, lugar_expedicion,        ← legado, equivale a ciudad_*
  foto_url, firma_url,                       ← apuntan a Storage
  estado_civil, escolaridad, profesion, cargo,
  empresa_id_actual,                         ← última empresa con la que asistió
  visitas_count, ultimo_expediente_id, ultima_visita_at,
  createdAt, updatedAt

expedientes/{EXP-YYYYMM-NNNN}         ← contenedor de UNA visita
  paciente_id: string                  ← FK a pacientes/{cc}  (v5)
  paciente_snapshot: { ... }           ← copia congelada al CERRAR (valor legal)
  empresa_id: string                   ← FK a empresas/{id} o "PARTICULAR"
  empresa_nombre: string               ← snapshot legible
  tipo_visita: 'ingreso'|'periodico'|'egreso'|'reintegro'|'post_incapacidad'
  fecha_visita: timestamp
  estado: 'recepcion'|'examenes'|'revision'|'cerrado'
  bloqueado: boolean
  examenes_estado: { historia_clinica, audiometria, visiometria,
                     optometria, concepto: 'pendiente'|'completado' }
  documentos: { audiometria: 'AUD-...', ... }
  log_actividad: [{ uid, accion, timestamp, nota }]
  creado_por_uid, creado_por_nombre
  createdAt, updatedAt

historias_clinicas/{HCO-YYYYMM-NNNN}  ← 8 secciones del formato F-AGH-07
  paciente_id, expediente_id, ...campos detallados

audiometrias/{AUD-YYYYMM-NNNN}        ← Audiograma + antecedentes
  paciente_id, expediente_id,
  antecedentes: { otitis, cirugia_otologica_descripcion,
                  acufenos, hipoacusia, ototoxicos },
  extralaboral, audiograma {od,oi}, otoscopia, resultados, recomendaciones

visiometrias/{VIS-YYYYMM-NNNN}        ← Snellen, Jaeger, Ishihara, etc.
optometrias/{OPT-YYYYMM-NNNN}         ← Examen optométrico completo

conceptos_aptitud/{CAP-YYYYMM-NNNN}   ← Concepto de Aptitud (interno: F-43)
  paciente_id, expediente_id,
  trabajador_snapshot, empresa_id, tipo_examen, examenes_realizados,
  concepto_valoracion, recomendaciones, firmas,
  pdf_url, pdf_generado_at, pdf_version
  ÚNICA colección que las empresas pueden leer

adjuntos/{ADJ-YYYYMM-NNNN}            ← Exámenes externos / lab tercerizado
  expediente_id, tipo, titulo, proveedor_externo, fecha_examen,
  archivo_url   ← ahora apunta a Storage: adjuntos/{folio}/{file}

users/{uid}                            ← Cuenta autenticada
  uid, rol, email, nombres, apellidos,
  tipo_documento, numero_documento,
  empresa_admin_de (solo si rol=empresa),
  firma_url, registro_profesional       ← médicos
  createdAt, updatedAt

empresas/{empresa_id}                  ← Empresas cliente (banco buscable)
  nit, razon_social, actividad_economica, direccion,
  ciudad, departamento, telefono, email_contacto, codigo_ciiu

counters/{TIPO_YYYYMM}                 ← Contador atómico para folios
catalogos/recomendaciones/items/{id}   ← 57 frases pre-escritas
catalogos/laboratorios/items/{id}      ← 10 laboratorios
config/{docId}                         ← Config global
```

### Storage

```
pacientes/{cedula}/foto.jpg            ← foto identificación (recepción)
pacientes/{cedula}/firma.png           ← firma del trabajador (recepción)
firmas-medicos/{uid}.png               ← firma reusable del médico
cap-pdfs/{folio}.pdf                   ← PDF firmado del CAP (persistente)
adjuntos/{folio}/{filename}            ← exámenes externos
```

**Sentinel**: `empresa_id = "PARTICULAR"` para pacientes independientes. Las empresas nunca ven docs con `empresa_id === 'PARTICULAR'` (las reglas lo bloquean).

---

## 📁 Archivos del proyecto

### Páginas públicas (indexables por Google)
| Archivo | Función |
|---|---|
| `index.html` | Home pública con SEO local, FAQ, schema MedicalClinic, links a redes |
| `politica-privacidad.html` | Política Habeas Data completa (Ley 1581) |
| `sitemap.xml` | Sitemap para Google |
| `robots.txt` | Permite home y política, bloquea áreas privadas |

### Portal y dashboards (privados, requieren login)
| Archivo | Rol/Función |
|---|---|
| `portal.html` | Login + registro (queda como `pendiente`) |
| `cuenta-pendiente.html` | Pantalla bloqueante para usuarios sin rol asignado |
| `dashboard-empleado.html` | Para secretaria/medico/admin. Sidebar con sección crear documentos + lista expedientes |
| `dashboard-empresa.html` | Para rol `empresa`: solo lista conceptos de su empresa |
| `dashboard-paciente.html` | **DESACTIVADO** — redirige a `index.html` tras 4s (rol paciente ya no existe en el modelo) |
| `usuarios.html` | Panel admin para aprobar/cambiar/eliminar usuarios |
| `empresas.html` | CRUD de empresas cliente (banco buscable). v5. |
| `pacientes.html` | Lista de pacientes maestros + botón "Reingreso". v5. |
| `perfil-medico.html` | Médico sube su firma reusable + registro profesional. v5. |

### Formularios clínicos
| Archivo | Función |
|---|---|
| `nuevo-expediente.html` | Flujo en 2 pasos: identificar paciente (busca por cédula) → datos + foto + firma |
| `expediente.html` | Vista de detalle con checklist + adjuntos + transiciones + descarga PDF CAP |
| `nueva-historia-clinica.html` | Wizard de 8 pasos del formato F-AGH-07 (precarga datos del paciente maestro) |
| `audiometria.html` | Audiograma 22 valores + bloque otitis/cirugías otológicas |
| `visiometria.html` | Snellen, Jaeger, Ishihara, estereopsis, campo visual |
| `optometria.html` | Anamnesis, examen externo, oftalmoscopía, estado refractivo |
| `nuevo-concepto-aptitud.html` | Concepto de Aptitud + pre-llenado de recomendaciones desde exámenes + genera PDF |

### Configuración y reglas
| Archivo | Función |
|---|---|
| `firestore.rules` | Reglas v5 (pegar en Firebase Console → Firestore → Reglas) |
| `storage.rules` | Reglas Cloud Storage v5 (pegar en Firebase Console → Storage → Reglas) |
| `netlify.toml` | Headers de seguridad + cache + build settings |
| `_redirects` | URLs limpias + bloqueo de archivos privados |
| `.gitignore` | Excluye CLAUDE.md, INSTRUCCIONES.md, FORMATOS HC SOFTWARE, etc. |

### Scripts y módulos JS
| Archivo | Función |
|---|---|
| `js/firebase-config.js` | Credenciales + ROLES + ESTADOS_EXPEDIENTE + TIPOS_DOCUMENTO + STORAGE_PATHS + `getNextFolio()` + `rolToDashboard()` |
| `js/auth-helper.js` | Cache local del rol (localStorage TTL 30 min) |
| `js/email-gate.js` | Pantalla bloqueante de verificación de correo |
| `js/seed-catalogos.js` | Script de semilla de 57 recomendaciones + 10 laboratorios |
| `js/catalogo-ciudades.js` | DIVIPOLA Colombia (~1100 municipios) para datalist. v5. |
| `js/utils.js` | Helpers compartidos: `calcularEdad()`, `setNested()`, `parseFecha()`, etc. v5. |
| `js/captura-foto.js` | Componente reusable de captura de foto con cámara/upload. v5. |
| `js/captura-firma.js` | Componente reusable de captura de firma (signature_pad). v5. |
| `js/pacientes-helper.js` | `buscarPaciente(cc)`, `crearPaciente()`, `precargarUltimaHC()`. v5. |
| `js/generar-pdf-cap.js` | jsPDF + html2canvas → genera PDF del CAP y sube a Storage. v5. |
| `js/firebase-setup.md` | Guía técnica de configuración Firebase |

### Assets
| Archivo | Uso |
|---|---|
| `assets/logo.png` | Logo horizontal para navbar |
| `assets/logo-cuadrado.png` | Favicon, share cards, Google Search, schema |
| `assets/nueva foto.jpeg` | Foto sección "Sobre nosotros" en home |
| `assets/cie-10.pdf` | Lista de diagnósticos CIE-10 (para consultar) |

### Documentación interna (excluida del deploy)
| Archivo | Función |
|---|---|
| `CLAUDE.md` | **Este archivo** — fuente de verdad del estado del proyecto |
| `INSTRUCCIONES.md` | Manual de operación para el dueño/equipo |
| `FORMATOS HC SOFTWARE/` | PDFs del cliente con datos reales (NO subir nunca a producción) |

---

## 🔐 Credenciales Firebase

```js
// js/firebase-config.js
apiKey: "AIzaSyA63ngfag7OZLy3hHTj_pTNQPnQmO3ZuZ4"
authDomain: "reina-maria-ips.firebaseapp.com"
projectId: "reina-maria-ips"
storageBucket: "reina-maria-ips.firebasestorage.app"
messagingSenderId: "661677352711"
appId: "1:661677352711:web:bb61b1a7080ba3feca07a2"
```

⚠️ El `apiKey` de Firebase **no es secreto** — está pensado para vivir en el cliente. La protección la dan las Firestore Rules + Storage Rules + dominios autorizados.

**Oficial de Protección de Datos**: Angie Daniela Castelblanco Velásquez (`reinamariaips2023@gmail.com`).
**WhatsApp comercial**: +57 317 430 2959.

---

## 🎯 Decisiones técnicas tomadas (no revertir sin discutirlo)

| Decisión | Razón |
|---|---|
| ~~**Plan B sin Cloud Storage**~~ → **Storage activado (v5)** | Cliente activó Blaze. Adjuntos, fotos, firmas y PDFs ahora viven en Storage. |
| **Pacientes como entidad maestra** (v5) | Antes el paciente vivía como snapshot dentro del expediente. Ahora `pacientes/{cc}` es entidad propia; el expediente solo guarda `paciente_id` y un snapshot congelado al cerrar. Permite reingreso sin reescribir datos. |
| **Foto y firma del paciente capturadas en recepción** (v5) | Una sola vez por paciente, reutilizadas en HC y CAP. La secretaria captura con cámara/tablet. |
| **Firma del médico única reusable** (v5) | El médico sube su firma una vez en `perfil-medico.html` → se estampa automática en cada CAP. |
| **PDF del CAP generado en cliente con jsPDF** (v5) | No requiere Cloud Functions. El PDF se sube a Storage y persiste aunque el expediente se cierre. La empresa siempre puede descargarlo. |
| **Sin QR en esta iteración** | Pospuesto a sprint futuro junto con verificación pública del CAP. |
| **DIVIPOLA Colombia como catálogo de ciudades** (v5) | JSON estático embebido. Opción "Otra" para casos extranjeros. |
| **Registro abierto + aprobación manual** | Se intentaron 2 enfoques con invitaciones; ambos fallaron por reglas Firestore en cascada. Esta solución es robusta y simple. |
| **Sin invitaciones por email** | Se eliminó `invitaciones.html`. Reemplazado por `usuarios.html`. |
| **5 roles incluyendo `pendiente`** | Permite registro libre sin riesgo (los pendientes no pueden hacer nada). |
| **Folio `EXP-YYYYMM-NNNN`** como ID del documento Firestore | Decidido sobre IDs aleatorios por trazabilidad. Confirmado por cliente. |
| **Workflow estafeta de 4 estados** | Modelo legal validado con cliente. Secretaria cierra, médico puede reabrir. |
| **`Concepto F-43`** renombrado a "Concepto de Aptitud" en UI | F-43 es código operativo, no nombre del documento. |
| **Logo cuadrado para Google** | Cambio requerido por SEO. `logo.png` rectangular sigue en navbar. |
| **Cache local del rol (30 min TTL)** | Reduce ~400ms por navegación. |
| **Modulepreload + prefetch** | Aplicado en portal y dashboard. |
| **Mobile-first design** | Clientes principalmente entran desde WhatsApp. |

---

## ⏳ Estado de funcionalidades

### ✅ Funcional
- Sitio público + SEO + Habeas Data
- Registro + verificación email + aprobación manual
- Dashboard con lista de expedientes
- Apertura de expediente con folio único
- Vista de expediente con checklist + transiciones de estado
- 5 formularios clínicos guardando en Firestore
- Dashboard empresa con filtros y stats
- Panel admin de usuarios
- **v5**: Pacientes maestros + foto + firma en recepción
- **v5**: Banco de empresas con autocomplete
- **v5**: Audiometría con bloque otitis/cirugías
- **v5**: Catálogo DIVIPOLA + edad automática en HC
- **v5**: CAP pre-llena recomendaciones desde exámenes
- **v5**: PDF del CAP generado y persistente en Storage
- **v5**: Reingreso de paciente (nueva visita con precarga última HC)

### 🟡 Pendiente de configuración (NO de desarrollo)
- **Publicar `firestore.rules` v5** en Firebase Console
- **Publicar `storage.rules` v5** en Firebase Console (ahora que Blaze está activo)
- Sembrar catálogos (`js/seed-catalogos.js` desde DevTools del admin)
- Crear empresas cliente reales desde `/empresas`
- Crear primera cuenta admin en Firestore Console
- Logo en Google Business Profile
- Información del dueño (NIT, habilitación, tarifario, lista médicos) — ver INSTRUCCIONES.md
- Médicos suben su firma en `/perfil-medico` (primera vez)

### ❌ NO implementado (sprints futuros)
1. **QR en el PDF del CAP** + página pública `/verificar?cap=...`
2. **Empresa firma de recibido** (canvas remoto)
3. **Selector visual de catálogo de recomendaciones** (las 57 frases sembradas se conectan al UI)
4. **Email automático** al aprobar usuario (requiere Cloud Functions)
5. **Exportador RIPS** (crítico antes del primer reporte mensual)
6. **Buscador avanzado** de pacientes/historias
7. **Notificaciones WhatsApp** al paciente cuando se cierra examen

---

## 🚨 Convenciones de código que NO se deben romper

- **Todas las URLs de assets/recursos en JSON-LD y meta tags usan dominio absoluto** (`https://reinamariaips.com/...`).
- **`navbar` siempre usa `logo.png`** (horizontal), **`<link rel="icon">` usa `logo-cuadrado.png`**.
- **Cada formulario clínico** debe:
  1. Recibir `?expediente=EXP-YYYYMM-NNNN` por URL.
  2. Leer el expediente → sacar `paciente_id` → cargar `pacientes/{paciente_id}` (datos maestros).
  3. Generar su folio con `getNextFolio(TIPOS_DOCUMENTO.XXX, db)`.
  4. Guardar con `setDoc(doc(db, 'coleccion', folio), data)` — incluir `paciente_id` y `expediente_id`.
  5. Actualizar el expediente con `updateDoc(... 'examenes_estado.xxx': 'completado', 'documentos.xxx': folio)`.
  6. Redirigir a `expediente.html?id={expediente_id}` al guardar.
- **Cualquier guardado de doc clínico** debe verificar primero que `expedienteAbierto(expediente_id)` sea true (lo hacen las reglas Firestore).
- **NUNCA usar `addDoc` para documentos clínicos** — usar `setDoc(doc(db, ..., folio), ...)` con folio explícito.
- **NUNCA pasar el `rol` en `setDoc` con merge** desde dashboards de usuario (las reglas Firestore lo rechazan, solo admin puede cambiarlo).
- **NUNCA guardar archivos binarios en Firestore** (límite 1MiB por doc) — usar Storage con los paths de `STORAGE_PATHS`.
- **NUNCA escribir paths de Storage hardcodeados** — usar `STORAGE_PATHS.foo(cedula)` de `firebase-config.js`.
- **El paciente maestro NO se borra cuando cierran el expediente**. Solo `admin` puede borrar pacientes.
- **Los snapshots dentro de docs clínicos cerrados son inmutables** — son la "fotocopia" legal del dato al momento del examen.

---

## 📞 Contactos del proyecto

- **Cliente**: Reina María IPS, Carrera 16 #14-54, Duitama, Boyacá.
- **Dueño**: (pendiente nombrar formalmente).
- **Oficial Habeas Data**: Angie Daniela Castelblanco Velásquez.
- **WhatsApp comercial**: +57 317 430 2959.
- **Email comercial**: reinamariaips2023@gmail.com.
- **Desarrollador**: Manuel Felipe Rodríguez Galindo (`rmanuelfelipe3@gmail.com` o `manuelfeliperodriguezgalindo@gmail.com`).
- **Dominio**: reinamariaips.com (Netlify).

---

## 🆘 Si algo falla en producción

1. **Login falla con "permission denied"** → publicar `firestore.rules` v5 en Firebase Console.
2. **Subida de foto/firma falla** → publicar `storage.rules` v5 en Firebase Console.
3. **Registro falla con "auth/operation-not-allowed"** → activar Email/Password en Firebase Auth → Sign-in method.
4. **El admin no puede ver `usuarios.html`** → verificar que su doc en `users/{uid}` tenga `rol: "admin"` exactamente (en minúsculas).
5. **Las páginas cargan lento** → revisar región Firestore (debería ser `southamerica-east1` idealmente).
6. **Cache de rol viejo después de cambio** → el sistema lo detecta y recarga automáticamente; si no, borrar `localStorage.rmips_user_cache_v1` manualmente.
7. **PDF del CAP no se genera** → revisar consola: jsPDF/html2canvas se cargan por CDN. Si bloqueado por red, el error indica `CDN load failed`.
8. **Empresa no puede descargar PDF** → verificar que `storage.rules` v5 esté publicada (la regla `cap-pdfs` permite a la empresa propietaria).

---

> **Versión actual de la arquitectura**: v5 (Blaze + Storage + Pacientes maestros + PDF persistente + Reingreso).
> **Última actualización mayor**: mayo de 2026.
