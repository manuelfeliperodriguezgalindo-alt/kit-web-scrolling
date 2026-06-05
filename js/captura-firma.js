// ─────────────────────────────────────────────────────────────────────
// Reina María IPS · Componente de captura de firma
// ─────────────────────────────────────────────────────────────────────
// Usa signature_pad (CDN, ~12KB). Carga dinámica para no pesar de entrada.
//
// Uso:
//   import { montarCapturaFirma } from './js/captura-firma.js';
//   const ctrl = await montarCapturaFirma(host, {
//     firmaExistenteUrl: 'https://...',
//     onChange: (blob) => {...}
//   });
//   const blob = await ctrl.getBlob();   // PNG transparente o null
//   ctrl.clear();
// ─────────────────────────────────────────────────────────────────────

import { loadScript } from './utils.js';

const SIGNATURE_PAD_CDN = 'https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js';

export async function montarCapturaFirma(host, { firmaExistenteUrl = null, onChange = () => {} } = {}) {
  if (!host) throw new Error('host requerido');
  await loadScript(SIGNATURE_PAD_CDN);
  // eslint-disable-next-line no-undef
  const SignaturePad = window.SignaturePad;

  host.innerHTML = `
    <div class="firma-wrap">
      ${firmaExistenteUrl
        ? `<div class="firma-existente"><img src="${escapeAttr(firmaExistenteUrl)}" alt="Firma actual"><span>Firma actual — dibuja una nueva para reemplazar</span></div>`
        : ''}
      <div class="firma-canvas-wrap">
        <canvas data-canvas class="firma-canvas"></canvas>
        <div class="firma-hint">Firme aquí con el dedo, mouse o lápiz táctil</div>
      </div>
      <div class="firma-actions">
        <button type="button" class="cf-btn cf-btn-ghost" data-clear>🧹 Limpiar</button>
      </div>
    </div>
  `;
  if (!document.getElementById('firma-styles')) {
    const style = document.createElement('style');
    style.id = 'firma-styles';
    style.textContent = `
      .firma-wrap { display: flex; flex-direction: column; gap: 0.6rem; }
      .firma-canvas-wrap { position: relative; border: 2px dashed var(--gray-100,#EEF3F7); border-radius: 12px; background: #FFFFFF; overflow: hidden; }
      .firma-canvas { display: block; width: 100%; height: 180px; touch-action: none; }
      .firma-hint { position: absolute; bottom: 8px; right: 12px; font-size: 0.75rem; color: var(--gray-500,#6B7280); pointer-events: none; }
      .firma-actions { display: flex; gap: 0.5rem; }
      .firma-existente { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.7rem; background: var(--yellow-soft,#FFF8E1); border: 1px solid var(--yellow,#FFD600); border-radius: 8px; font-size: 0.78rem; color: var(--yellow-dark,#F9A825); }
      .firma-existente img { height: 36px; background: #FFF; padding: 2px; border-radius: 4px; }
    `;
    document.head.appendChild(style);
  }

  const canvas = host.querySelector('[data-canvas]');

  // Ajustar resolución del canvas para alta densidad
  function resize() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    pad?.clear();
  }
  const pad = new SignaturePad(canvas, {
    backgroundColor: 'rgba(255,255,255,0)',
    penColor: '#0E3D6E',
    minWidth: 1.2,
    maxWidth: 2.5
  });
  resize();
  window.addEventListener('resize', resize);

  pad.addEventListener('endStroke', () => {
    onChange(pad.isEmpty() ? null : 'pendiente-blob');
  });

  host.querySelector('[data-clear]').addEventListener('click', () => {
    pad.clear();
    onChange(null);
  });

  return {
    async getBlob() {
      if (pad.isEmpty()) return null;
      const dataUrl = pad.toDataURL('image/png');
      const res = await fetch(dataUrl);
      return await res.blob();
    },
    isEmpty: () => pad.isEmpty(),
    clear: () => { pad.clear(); onChange(null); }
  };
}

function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}
