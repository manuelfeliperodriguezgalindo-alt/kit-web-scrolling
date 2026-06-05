// ─────────────────────────────────────────────────────────────────────
// Reina María IPS · Utilidades compartidas
// ─────────────────────────────────────────────────────────────────────
// Funciones reusables entre formularios. Antes vivían duplicadas en cada
// HTML — sacarlas aquí evita que un fix en un formulario olvide los demás.
// ─────────────────────────────────────────────────────────────────────

// ── Edad calculada desde fecha de nacimiento (ISO 'YYYY-MM-DD' o Date) ──
export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const fn = fechaNacimiento instanceof Date ? fechaNacimiento : new Date(fechaNacimiento);
  if (isNaN(fn.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fn.getFullYear();
  const m = hoy.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--;
  return edad < 0 || edad > 130 ? null : edad;
}

// ── Conectar fecha_nacimiento → edad en un formulario ──
// Llamar con los IDs (o elementos) de los dos inputs.
export function vincularEdadAFechaNacimiento(fechaInput, edadInput) {
  const f = typeof fechaInput === 'string' ? document.getElementById(fechaInput) : fechaInput;
  const e = typeof edadInput === 'string' ? document.getElementById(edadInput) : edadInput;
  if (!f || !e) return;
  const recalc = () => {
    const edad = calcularEdad(f.value);
    if (edad !== null) { e.value = edad; e.readOnly = true; }
  };
  f.addEventListener('input', recalc);
  f.addEventListener('change', recalc);
  recalc();
}

// ── Helpers de objetos anidados ──
// setNested(obj, 'a.b.c', 42) → obj.a.b.c = 42 (creando intermediarios)
export function setNested(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

export function getNested(obj, path) {
  if (!obj) return undefined;
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// ── Humanizar strings snake_case → "Snake Case" ──
export function humanize(s) {
  return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Fechas ──
export function isoHoy() {
  return new Date().toISOString().split('T')[0];
}

export function formatoFechaEs(fecha) {
  if (!fecha) return '';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Carga dinámica de scripts (CDN) ──
// Útil para jsPDF / html2canvas / signature_pad que solo se necesitan a veces.
const _scriptCache = new Map();
export function loadScript(url) {
  if (_scriptCache.has(url)) return _scriptCache.get(url);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar: ' + url));
    document.head.appendChild(s);
  });
  _scriptCache.set(url, p);
  return p;
}

// ── Aplicar un objeto data plano a un form con data-path ──
// Ejemplo: { 'paciente.nombres': 'Juan' } → asigna value al input con data-path correspondiente.
export function rellenarFormDesdeObjeto(formEl, datos, prefix = '') {
  Object.entries(datos || {}).forEach(([k, v]) => {
    if (v == null) return;
    if (typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      rellenarFormDesdeObjeto(formEl, v, prefix ? `${prefix}.${k}` : k);
      return;
    }
    const path = prefix ? `${prefix}.${k}` : k;
    const el = formEl.querySelector(`[data-path="${CSS.escape(path)}"]`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'date' && v) {
      const d = v instanceof Date ? v : (v.toDate ? v.toDate() : new Date(v));
      el.value = isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    }
    else el.value = v;
  });
}

// ── Construir objeto desde inputs con data-path ──
export function leerFormDesdePaths(formEl) {
  const data = {};
  formEl.querySelectorAll('[data-path]').forEach(el => {
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.type === 'number') value = el.value === '' ? null : Number(el.value);
    else if (el.type === 'date') value = el.value ? new Date(el.value) : null;
    else value = el.value;
    setNested(data, el.dataset.path, value);
  });
  return data;
}

// ── Alerts genéricos (asume contenedor con id="alert" con clase .alert) ──
export function showAlert(type, msg, containerId = 'alert') {
  const a = document.getElementById(containerId);
  if (!a) { alert(msg); return; }
  a.className = 'alert show alert-' + type;
  a.textContent = msg;
  a.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Validador básico: ¿el objeto tiene todas las claves no-vacías? ──
export function camposObligatorios(obj, keys) {
  const faltan = [];
  keys.forEach(k => {
    const v = getNested(obj, k);
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) faltan.push(k);
  });
  return faltan;
}

// ── Generar trozo de HTML para datalist de ciudades ──
// Importa el catálogo y devuelve un nodo <datalist id="listId"> listo para inyectar.
export async function crearDatalistCiudades(listId) {
  const { CIUDADES_COLOMBIA } = await import('./catalogo-ciudades.js');
  const dl = document.createElement('datalist');
  dl.id = listId;
  CIUDADES_COLOMBIA.forEach(c => {
    const opt = document.createElement('option');
    opt.value = `${c.municipio}, ${c.departamento}`;
    dl.appendChild(opt);
  });
  const otra = document.createElement('option');
  otra.value = 'Otra (especificar)';
  dl.appendChild(otra);
  return dl;
}

// ── Conectar un input al datalist de ciudades (lo crea si no existe) ──
export async function conectarInputAciudades(inputEl, datalistId = 'listaCiudadesCol') {
  if (!document.getElementById(datalistId)) {
    const dl = await crearDatalistCiudades(datalistId);
    document.body.appendChild(dl);
  }
  inputEl.setAttribute('list', datalistId);
  inputEl.setAttribute('placeholder', 'Empieza a escribir... (ej. Tunja, Boyacá)');
}
