# Manual de operación — Reina María IPS

> Guía rápida para activar y operar la plataforma. Si eres desarrollador y necesitas el detalle técnico, lee [`CLAUDE.md`](CLAUDE.md).

---

## ☑️ Antes del Go-Live (checklist)

### A. Firebase Console
- [ ] **Authentication → Sign-in method**: activar "Correo electrónico/contraseña".
- [ ] **Authentication → Settings → Authorized domains**: añadir `reinamariaips.com` y `www.reinamariaips.com`.
- [ ] **Authentication → Templates**: traducir al español los correos de verificación y reset.
- [ ] **Firestore Database**: ya creada en modo Producción.
- [ ] **Firestore → Reglas**: pegar el contenido de [`firestore.rules`](firestore.rules) y publicar.

### B. Crear primera cuenta admin
1. Registrarse normalmente desde `/portal`.
2. Firebase Console → Firestore Database → `users/{tu uid}`.
3. Editar campo `rol`: cambiar `"pendiente"` por `"admin"`.
4. Cerrar sesión y volver a entrar.

### C. Sembrar catálogos (opcional pero recomendado)
Desde el dashboard ya logueado como admin:
1. F12 → Console.
2. Pega: `import('./js/seed-catalogos.js').then(m => m.sembrarCatalogos())`.
3. Espera el mensaje `✓ Semilla completada`.

### D. Documentos del dueño pendientes de entregar
**Críticos para operar legalmente** (antes del Go-Live):
- [ ] Resolución de Habilitación de la IPS (PDF).
- [ ] NIT con dígito de verificación.
- [ ] Razón social oficial.
- [ ] Tarifario actualizado de exámenes (Excel).
- [ ] Lista de servicios habilitados con sus códigos CUPS.

**Necesarios primer mes**:
- [ ] Cámara de Comercio (no mayor a 30 días).
- [ ] RUT actualizado.
- [ ] Resoluciones tarifarias con EPS (si aplica).
- [ ] Acta de designación del Oficial de Protección de Datos (Angie Castelblanco).
- [ ] Modelo de consentimiento informado para pacientes.
- [ ] Certificado ARL del personal interno.

**Para empresas cliente** (excel con):
- [ ] NIT, razón social, actividad económica (CIIU).
- [ ] Dirección, ciudad, departamento.
- [ ] Nombre y correo del coordinador SST de cada empresa.

---

## 🔄 Flujo operativo diario

### Para la SECRETARIA

1. **Llega un paciente** → entra a `/portal` → inicia sesión.
2. Dashboard → "Nuevo expediente" → captura datos básicos del paciente + tipo de visita + empresa.
3. Sistema genera folio (ej. `EXP-202605-0001`) → secretaria copia el folio o nota el nombre.
4. Pasa el paciente al médico (físicamente).
5. Cuando el médico termine todos los exámenes, va al expediente → click **"🔒 Cerrar expediente"** → bloqueo legal.
6. Imprime el concepto de aptitud (cuando esté la funcionalidad PDF).

### Para el MÉDICO

1. Inicia sesión → Dashboard → ve la lista de expedientes recientes.
2. Click en el expediente del paciente que está atendiendo.
3. Ve los exámenes con estado **"Pendiente"** → click "+ Diligenciar" en cada uno.
4. Llena audiometría, visiometría, optometría, historia clínica, concepto.
5. Cuando termine, click **"→ Marcar listo para revisión"**.

### Para el COORDINADOR SST de una EMPRESA

1. Inicia sesión → entra directo a su dashboard (filtrado a su empresa).
2. Ve la lista de conceptos de aptitud de sus trabajadores.
3. Puede filtrar por estado (apto, restricciones, no apto) o por tipo de examen.
4. (Próximamente) Descarga el PDF del concepto firmado.

### Para el ADMIN

1. Cuando un usuario nuevo se registra, le aparece un **badge amarillo en "Usuarios"** del sidebar.
2. Entra a `/usuarios` → click en el botón **"✓ Aprobar"** del pendiente.
3. Selecciona rol (medico/secretaria/empresa).
4. Si es empresa, escribe el ID de la empresa que administra (ID del doc en `/empresas`).
5. Guardar → usuario aprobado.

---

## 🔧 Mantenimiento básico

### Cómo añadir una empresa cliente
1. Firebase Console → Firestore Database → colección `empresas/`.
2. **+ Agregar documento** → ID: algo legible como `construcol-ingenieria` o el NIT.
3. Campos: `nit`, `razon_social`, `actividad_economica`, `direccion`, `ciudad`, `departamento`, `telefono`, `email_contacto`.
4. Guardar.

### Cómo cambiar el rol de un usuario
1. Vía panel: `/usuarios` → click "Cambiar rol" en cualquier fila.
2. Vía Firestore (manual): `users/{uid}` → editar campo `rol`.

### Cómo eliminar una invitación zombi
- **El sistema ya no usa invitaciones**. Si encuentras una colección `invitaciones/` en Firestore, puedes borrarla completa (legacy).

### Cómo desbloquear un expediente cerrado
- Médico o admin → entra al expediente → click "🔓 Reabrir expediente" → escribe motivo → confirmar.
- Queda registrado en `log_actividad`.

---

## 🚨 Si algo falla

| Síntoma | Causa probable | Solución |
|---|---|---|
| "Permisos insuficientes" al registrarse | Reglas Firestore no publicadas | Firebase Console → Firestore → Reglas → pegar `firestore.rules` → Publicar |
| "Operation not allowed" al registrarse | Email/Password no activado | Authentication → Sign-in method → activar |
| No llega correo de verificación | Filtrado como spam | Revisar carpeta spam de Gmail/Outlook |
| El admin no puede ver `/usuarios` | Rol no es exactamente `"admin"` | Firestore → users → verificar el campo |
| Cuenta zombi en Auth (registro previo fallido) | Auth creado pero Firestore no | Authentication → Users → eliminar el correo zombi |
| Las páginas cargan lento | Latencia región Firestore | Ver sección "Optimizaciones aplicadas" en CLAUDE.md |

---

## 💰 Costos actuales

| Servicio | Plan | Costo |
|---|---|---|
| Netlify (hosting) | Free | $0 |
| Firebase Spark (Auth + Firestore) | Free | $0 |
| Dominio reinamariaips.com | Anual | ~$60.000 COP/año |
| Cloud Storage | NO activado | $0 |
| Cloud Functions | NO activado | $0 |
| **Total operativo mensual** | | **$0 USD** |

---

## 📞 Soporte técnico

- **Desarrollador**: Manuel Felipe Rodríguez Galindo
- **Correo**: rmanuelfelipe3@gmail.com
- **Plan de mantenimiento**: por definir (ver `CLAUDE.md` sección "Plan de mantenimiento mensual").
