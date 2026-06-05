// ── Auth Helper — Cache local del rol del usuario ──
// Reduce el tiempo de carga entre páginas: en lugar de esperar a Firestore
// cada vez para saber el rol, lo leemos primero desde localStorage y en
// segundo plano refrescamos. Si el rol cambió (admin promovió/degradó),
// se recarga la página automáticamente.

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const CACHE_KEY    = 'rmips_user_cache_v1';
const CACHE_TTL_MS = 30 * 60 * 1000;   // 30 minutos

// ── Persistencia ──
export function getCachedUser() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null;   // Expirada
    return obj.data;
  } catch (_) { return null; }
}

export function setCachedUser(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
}

export function clearCachedUser() {
  try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
}

// ── Función principal: lee del cache o de Firestore ──
// Uso típico en un dashboard:
//   const { data, isStale } = await getUserData(db, user.uid);
//   pintarUI(data);
//   if (isStale) ... // (opcional) mostrar indicador "actualizando"
export async function getUserData(db, uid) {
  const cached = getCachedUser();

  // Si el cache es del mismo uid y tiene rol, devolvemos al instante.
  if (cached && cached.uid === uid && cached.rol) {
    // En segundo plano, refrescar desde Firestore
    refreshInBackground(db, uid, cached);
    return { data: cached, isStale: true };
  }

  // Sin cache: ir directo a Firestore
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.exists() ? snap.data() : { uid };
  setCachedUser(data);
  return { data, isStale: false };
}

// Refresca el cache silenciosamente. Si detecta cambio de rol,
// fuerza recarga de la página para aplicar las nuevas reglas.
async function refreshInBackground(db, uid, cached) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return;
    const fresh = snap.data();
    setCachedUser(fresh);
    // Si el rol cambió, recargar (admin promovió/degradó o pasó de pendiente a activo)
    if (fresh.rol !== cached.rol) {
      console.log('[auth-helper] Rol cambió:', cached.rol, '→', fresh.rol, '· recargando');
      window.location.reload();
    }
  } catch (e) {
    // Silencioso — no romper la UX si hay error de red
  }
}
