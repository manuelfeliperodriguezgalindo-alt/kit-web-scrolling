// ── Firebase Config — Reina María IPS ──
// Punto único de configuración. Si cambian las credenciales, se actualizan SOLO aquí.

import {
  runTransaction,
  doc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: "AIzaSyA63ngfag7OZLy3hHTj_pTNQPnQmO3ZuZ4",
  authDomain: "reina-maria-ips.firebaseapp.com",
  projectId: "reina-maria-ips",
  storageBucket: "reina-maria-ips.firebasestorage.app",
  messagingSenderId: "661677352711",
  appId: "1:661677352711:web:bb61b1a7080ba3feca07a2",
  measurementId: "G-80P717VYZL"
};

// ─────────────────────────────────────────────────────────────────────
// ROLES — 5 roles operativos del sistema
// ─────────────────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  PENDIENTE:  'pendiente',
  SECRETARIA: 'secretaria',
  MEDICO:     'medico',
  EMPRESA:    'empresa',
  ADMIN:      'admin'
});

// ─────────────────────────────────────────────────────────────────────
// ESTADOS DEL EXPEDIENTE — workflow tipo "estafeta"
// ─────────────────────────────────────────────────────────────────────
export const ESTADOS_EXPEDIENTE = Object.freeze({
  RECEPCION: 'recepcion',
  EXAMENES:  'examenes',
  REVISION:  'revision',
  CERRADO:   'cerrado'
});

// ─────────────────────────────────────────────────────────────────────
// TIPOS DE DOCUMENTO (3 letras → prefijo de folio)
// ─────────────────────────────────────────────────────────────────────
export const TIPOS_DOCUMENTO = Object.freeze({
  EXPEDIENTE:  'EXP',
  HISTORIA:    'HCO',
  CONCEPTO:    'CAP',
  AUDIOMETRIA: 'AUD',
  VISIOMETRIA: 'VIS',
  OPTOMETRIA:  'OPT',
  ADJUNTO:     'ADJ'
});

// Códigos legales del formato impreso
export const CODIGOS_FORMATO = Object.freeze({
  HISTORIA: 'F-AGH-07',
  CONCEPTO: 'F-43'   // se mantiene en metadata interna; NO se muestra en UI
});

// Sentinel para pacientes que no pertenecen a empresa cliente
export const EMPRESA_PARTICULAR = 'PARTICULAR';

// ─────────────────────────────────────────────────────────────────────
// STORAGE PATHS — convención centralizada para no dispersar strings
// ─────────────────────────────────────────────────────────────────────
export const STORAGE_PATHS = Object.freeze({
  fotoPaciente:  (cedula) => `pacientes/${cedula}/foto.jpg`,
  firmaPaciente: (cedula) => `pacientes/${cedula}/firma.png`,
  firmaMedico:   (uid)    => `firmas-medicos/${uid}.png`,
  capPdf:        (folio)  => `cap-pdfs/${folio}.pdf`,
  adjunto:       (folio, filename) => `adjuntos/${folio}/${filename}`
});

// ─────────────────────────────────────────────────────────────────────
// REDIRECCIÓN POR ROL
// ─────────────────────────────────────────────────────────────────────
export function rolToDashboard(rol) {
  if (rol === ROLES.PENDIENTE) return 'cuenta-pendiente.html';
  if (rol === ROLES.EMPRESA)   return 'dashboard-empresa.html';
  return 'dashboard-empleado.html';
}

// ─────────────────────────────────────────────────────────────────────
// FOLIO — consecutivo atómico por tipo + mes
// Formato: TIPO-YYYYMM-NNNN  →  Ejemplo: HCO-202605-0001
// ─────────────────────────────────────────────────────────────────────
export async function getNextFolio(tipo, db) {
  if (!Object.values(TIPOS_DOCUMENTO).includes(tipo)) {
    throw new Error(`Tipo de documento inválido: ${tipo}`);
  }
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const periodo = `${yyyy}${mm}`;
  const counterId = `${tipo}_${periodo}`;

  const nextValue = await runTransaction(db, async (tx) => {
    const ref = doc(db, 'counters', counterId);
    const snap = await tx.get(ref);
    const val = (snap.exists() ? snap.data().valor : 0) + 1;
    tx.set(ref, {
      valor: val,
      tipo,
      periodo,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return val;
  });

  return `${tipo}-${periodo}-${String(nextValue).padStart(4, '0')}`;
}

// Helper visual: dado un folio, devuelve { tipo, periodo, numero }
export function parseFolio(folio) {
  const m = String(folio).match(/^([A-Z]{3})-(\d{6})-(\d{4})$/);
  if (!m) return null;
  return { tipo: m[1], periodo: m[2], numero: parseInt(m[3], 10), folio };
}
