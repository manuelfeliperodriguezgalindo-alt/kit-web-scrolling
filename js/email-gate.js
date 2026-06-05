// ── Email Verification Gate ──
// Bloquea el acceso al dashboard si el usuario no verificó su correo.
// Inyecta una pantalla full-screen con botón "Reenviar" y "He verificado".

import { sendEmailVerification, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const STYLE = `
  .email-gate-overlay {
    position: fixed; inset: 0; z-index: 99999;
    background: linear-gradient(135deg, #0E3D6E, #1E6FB3);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem; font-family: 'Inter', system-ui, sans-serif;
  }
  .email-gate-card {
    background: #fff; border-radius: 22px; padding: 2.5rem 2rem;
    max-width: 460px; width: 100%; text-align: center;
    box-shadow: 0 18px 60px rgba(0,0,0,0.3);
  }
  .email-gate-icon { font-size: 3rem; margin-bottom: 0.75rem; }
  .email-gate-card h2 {
    font-family: 'Playfair Display', serif;
    color: #0E3D6E; font-size: 1.5rem; margin-bottom: 0.6rem;
  }
  .email-gate-card p { color: #4B5563; font-size: 0.92rem; line-height: 1.55; margin-bottom: 0.8rem; }
  .email-gate-card .email-display {
    background: #EAF3FB; color: #0E3D6E; font-weight: 600;
    padding: 0.5rem 0.85rem; border-radius: 8px; display: inline-block;
    margin: 0.4rem 0 1.4rem; font-size: 0.88rem;
  }
  .email-gate-actions {
    display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.5rem;
  }
  .email-gate-btn {
    border: none; cursor: pointer; padding: 0.85rem 1rem; border-radius: 10px;
    font-size: 0.92rem; font-weight: 600; font-family: inherit; transition: all 0.2s;
  }
  .email-gate-btn-primary {
    background: linear-gradient(135deg, #1E6FB3, #0E3D6E); color: #fff;
  }
  .email-gate-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(30,111,179,0.4); }
  .email-gate-btn-ghost {
    background: transparent; color: #4B5563; border: 1.5px solid #E2E8F0;
  }
  .email-gate-btn-ghost:hover { background: #F7FAFC; }
  .email-gate-btn-link {
    background: none; color: #DC2626; text-decoration: underline; padding: 0.4rem;
  }
  .email-gate-msg { font-size: 0.82rem; margin-top: 0.6rem; min-height: 1em; }
  .email-gate-msg.ok { color: #16A34A; }
  .email-gate-msg.err { color: #DC2626; }
`;

export function showEmailGate(user, auth) {
  // Evita duplicados
  if (document.getElementById('email-gate-overlay')) return;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  const overlay = document.createElement('div');
  overlay.id = 'email-gate-overlay';
  overlay.className = 'email-gate-overlay';
  overlay.innerHTML = `
    <div class="email-gate-card">
      <div class="email-gate-icon">📧</div>
      <h2>Verifica tu correo</h2>
      <p>Te enviamos un enlace de verificación a:</p>
      <div class="email-display">${user.email}</div>
      <p>Haz clic en el enlace del correo para activar tu cuenta. Revisa también la carpeta de spam.</p>
      <div class="email-gate-actions">
        <button id="eg-check"  class="email-gate-btn email-gate-btn-primary">Ya verifiqué, continuar</button>
        <button id="eg-resend" class="email-gate-btn email-gate-btn-ghost">Reenviar correo</button>
        <button id="eg-logout" class="email-gate-btn email-gate-btn-link">Cerrar sesión</button>
      </div>
      <div id="eg-msg" class="email-gate-msg"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const msg = overlay.querySelector('#eg-msg');
  const setMsg = (text, ok) => { msg.textContent = text; msg.className = 'email-gate-msg ' + (ok ? 'ok' : 'err'); };

  overlay.querySelector('#eg-check').addEventListener('click', async () => {
    setMsg('Comprobando...', true);
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        overlay.remove(); styleEl.remove();
        window.location.reload();
      } else {
        setMsg('Aún no detectamos la verificación. Espera unos segundos y vuelve a intentar.', false);
      }
    } catch (e) { setMsg('Error al comprobar. Intenta de nuevo.', false); }
  });

  overlay.querySelector('#eg-resend').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      await sendEmailVerification(user);
      setMsg('Correo reenviado. Revisa tu bandeja.', true);
    } catch (err) {
      setMsg(err.code === 'auth/too-many-requests'
        ? 'Demasiados intentos. Espera unos minutos.'
        : 'No pudimos reenviar. Intenta más tarde.', false);
    } finally {
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Reenviar correo'; }, 1800);
    }
  });

  overlay.querySelector('#eg-logout').addEventListener('click', async () => {
    try { await signOut(auth); } catch (_) {}
    try { localStorage.removeItem('rmips_user_cache_v1'); } catch (_) {}
    window.location.href = 'portal.html';
  });
}
