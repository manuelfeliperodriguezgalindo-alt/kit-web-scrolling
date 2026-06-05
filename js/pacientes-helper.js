// ─────────────────────────────────────────────────────────────────────
// Reina María IPS · Pacientes helper
// ─────────────────────────────────────────────────────────────────────
// Centraliza la lógica de la entidad maestra `pacientes/{cedula}`:
//   • Buscar paciente existente por cédula.
//   • Crear o actualizar paciente (con subida opcional de foto+firma).
//   • Buscar última HC o último expediente del paciente.
//
// Diseño: el ID del documento es el número de documento (cédula) directamente.
// Esto facilita buscar sin queries (`getDoc` por ID, O(1)) y garantiza unicidad.
// ─────────────────────────────────────────────────────────────────────

import {
  doc, getDoc, setDoc, serverTimestamp, increment,
  collection, query, where, orderBy, limit, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { STORAGE_PATHS } from './firebase-config.js';

// ── ID del paciente (normalizado para usarse como path Firestore) ──
export function pacienteId(cedula) {
  return String(cedula || '').trim().replace(/\s+/g, '');
}

// ── Buscar paciente por cédula. Devuelve null si no existe ──
export async function buscarPaciente(db, cedula) {
  const id = pacienteId(cedula);
  if (!id) return null;
  const snap = await getDoc(doc(db, 'pacientes', id));
  return snap.exists() ? { id, ...snap.data() } : null;
}

// ── Crear o actualizar paciente. Sube foto/firma a Storage si vienen ──
// data = { tipo_documento, nombres, apellidos, fecha_nacimiento, sexo,
//          telefono, direccion, ciudad_residencia, ciudad_nacimiento,
//          ciudad_expedicion, estado_civil, escolaridad, profesion, cargo,
//          empresa_id_actual, eps, afp, arl }
// files = { foto: Blob|File|null, firma: Blob|File|null }
export async function guardarPaciente(db, app, cedula, data, files = {}) {
  const id = pacienteId(cedula);
  if (!id) throw new Error('Cédula obligatoria.');
  const storage = getStorage(app);

  // Subir foto si llegó
  let foto_url = data.foto_url || null;
  if (files.foto) {
    const r = ref(storage, STORAGE_PATHS.fotoPaciente(id));
    await uploadBytes(r, files.foto, { contentType: files.foto.type || 'image/jpeg' });
    foto_url = await getDownloadURL(r);
  }
  // Subir firma si llegó
  let firma_url = data.firma_url || null;
  if (files.firma) {
    const r = ref(storage, STORAGE_PATHS.firmaPaciente(id));
    await uploadBytes(r, files.firma, { contentType: 'image/png' });
    firma_url = await getDownloadURL(r);
  }

  const payload = {
    numero_documento: id,
    tipo_documento:   data.tipo_documento || 'CC',
    nombres:          (data.nombres   || '').trim(),
    apellidos:        (data.apellidos || '').trim(),
    fecha_nacimiento: data.fecha_nacimiento || null,
    sexo:             data.sexo || null,
    telefono:         data.telefono || '',
    direccion:        data.direccion || '',
    ciudad_residencia: data.ciudad_residencia || '',
    ciudad_nacimiento: data.ciudad_nacimiento || '',
    ciudad_expedicion: data.ciudad_expedicion || '',
    estado_civil:     data.estado_civil || '',
    escolaridad:      data.escolaridad || '',
    profesion:        data.profesion || '',
    cargo:            data.cargo || '',
    empresa_id_actual: data.empresa_id_actual || null,
    eps:              data.eps || '',
    afp:              data.afp || '',
    arl:              data.arl || '',
    foto_url,
    firma_url,
    updatedAt:        serverTimestamp()
  };
  // Solo asignar createdAt si es nuevo
  const existing = await getDoc(doc(db, 'pacientes', id));
  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
    payload.visitas_count = 0;
  }
  await setDoc(doc(db, 'pacientes', id), payload, { merge: true });
  return { id, ...payload };
}

// ── Incrementar contador de visitas y marcar último expediente ──
export async function registrarVisita(db, pacienteIdStr, expedienteId) {
  await setDoc(doc(db, 'pacientes', pacienteIdStr), {
    visitas_count: increment(1),
    ultimo_expediente_id: expedienteId,
    ultima_visita_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// ── Buscar la última HC del paciente (para precargar en reingreso) ──
export async function ultimaHistoriaClinica(db, pacienteIdStr) {
  const q = query(
    collection(db, 'historias_clinicas'),
    where('paciente_id', '==', pacienteIdStr),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ── Listar todos los expedientes del paciente ──
export async function listarExpedientesDePaciente(db, pacienteIdStr) {
  const q = query(
    collection(db, 'expedientes'),
    where('paciente_id', '==', pacienteIdStr),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Subir firma del médico (en perfil) ──
export async function subirFirmaMedico(app, uid, blob) {
  const storage = getStorage(app);
  const r = ref(storage, STORAGE_PATHS.firmaMedico(uid));
  await uploadBytes(r, blob, { contentType: 'image/png' });
  return await getDownloadURL(r);
}
