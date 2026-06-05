// ─────────────────────────────────────────────────────────────────────
// Reina María IPS · Empresas helper
// ─────────────────────────────────────────────────────────────────────
// Carga, cachea y busca el banco de empresas. Compartido entre
// `empresas.html` (CRUD) y `nuevo-expediente.html` (autocomplete).
//
// Patrón usado:
//   • TTL en memoria (sessionStorage NO usamos para evitar staleness al
//     crear una nueva empresa desde otra pestaña).
//   • Una sola consulta por carga de página → filtros en cliente.
// ─────────────────────────────────────────────────────────────────────

import {
  collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { EMPRESA_PARTICULAR } from './firebase-config.js';

let _cache = null;
let _cacheAt = 0;
const TTL_MS = 60 * 1000;  // 1 min en sesión actual

// ── Cargar todas las empresas (con cache) ──
export async function listarEmpresas(db, { force = false } = {}) {
  if (!force && _cache && (Date.now() - _cacheAt) < TTL_MS) return _cache;
  const q = query(collection(db, 'empresas'), orderBy('razon_social'));
  const snap = await getDocs(q);
  _cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  _cacheAt = Date.now();
  return _cache;
}

// ── Invalidar cache (tras crear/editar/borrar) ──
export function invalidarCacheEmpresas() {
  _cache = null;
  _cacheAt = 0;
}

// ── Buscar por texto libre en razón social, NIT o id ──
export function filtrarEmpresas(empresas, texto) {
  const t = String(texto || '').trim().toLowerCase();
  if (!t) return empresas;
  return empresas.filter(e =>
    String(e.razon_social || '').toLowerCase().includes(t) ||
    String(e.nit || '').toLowerCase().includes(t) ||
    String(e.id || '').toLowerCase().includes(t) ||
    String(e.actividad_economica || '').toLowerCase().includes(t)
  );
}

// ── Crear o actualizar una empresa ──
// idSugerido puede ser el NIT o un slug legible. Si está vacío, se genera del nombre.
export async function guardarEmpresa(db, data, { idSugerido = null } = {}) {
  const id = (idSugerido || slugify(data.razon_social)).trim();
  if (!id) throw new Error('ID o razón social requeridos.');
  if (id === EMPRESA_PARTICULAR) throw new Error(`"${EMPRESA_PARTICULAR}" es un ID reservado.`);
  const payload = {
    nit: (data.nit || '').trim(),
    razon_social: (data.razon_social || '').trim(),
    actividad_economica: (data.actividad_economica || '').trim(),
    codigo_ciiu: (data.codigo_ciiu || '').trim(),
    direccion: (data.direccion || '').trim(),
    ciudad: (data.ciudad || '').trim(),
    departamento: (data.departamento || '').trim(),
    telefono: (data.telefono || '').trim(),
    email_contacto: (data.email_contacto || '').trim().toLowerCase(),
    updatedAt: serverTimestamp()
  };
  if (!data.id) payload.createdAt = serverTimestamp();
  await setDoc(doc(db, 'empresas', id), payload, { merge: true });
  invalidarCacheEmpresas();
  return { id, ...payload };
}

export async function eliminarEmpresa(db, id) {
  await deleteDoc(doc(db, 'empresas', id));
  invalidarCacheEmpresas();
}

// ── Slugify simple ──
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ── Conectar un <input> + <datalist> como autocomplete de empresas ──
// onSelect recibe el objeto empresa completo (o null si es PARTICULAR / sin match).
export async function conectarInputAEmpresas(inputEl, db, { onSelect, incluirParticular = true } = {}) {
  const empresas = await listarEmpresas(db);
  const datalistId = inputEl.dataset.listId || `lstEmp_${Math.random().toString(36).slice(2, 8)}`;
  inputEl.setAttribute('list', datalistId);
  let dl = document.getElementById(datalistId);
  if (!dl) { dl = document.createElement('datalist'); dl.id = datalistId; document.body.appendChild(dl); }
  dl.innerHTML = '';
  if (incluirParticular) {
    const optP = document.createElement('option');
    optP.value = `PARTICULAR — Paciente independiente`;
    optP.dataset.empresaId = EMPRESA_PARTICULAR;
    dl.appendChild(optP);
  }
  empresas.forEach(e => {
    const opt = document.createElement('option');
    opt.value = `${e.razon_social} — ${e.actividad_economica || 'Sin actividad económica'}`;
    opt.dataset.empresaId = e.id;
    dl.appendChild(opt);
  });
  // Cuando el usuario elige, resolvemos a un id real
  inputEl.addEventListener('change', () => {
    const v = inputEl.value;
    const opt = Array.from(dl.options).find(o => o.value === v);
    if (opt) {
      const empresaId = opt.dataset.empresaId;
      const empresa = empresaId === EMPRESA_PARTICULAR
        ? { id: EMPRESA_PARTICULAR, razon_social: 'PARTICULAR', actividad_economica: '' }
        : empresas.find(e => e.id === empresaId) || null;
      if (typeof onSelect === 'function') onSelect(empresa);
    } else {
      if (typeof onSelect === 'function') onSelect(null);
    }
  });
}
