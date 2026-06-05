// ─────────────────────────────────────────────────────────────────────
// Reina María IPS · Componente de captura de foto
// ─────────────────────────────────────────────────────────────────────
// Uso:
//   import { montarCapturaFoto } from './js/captura-foto.js';
//   const ctrl = montarCapturaFoto(document.getElementById('foto'), {
//     fotoExistenteUrl: 'https://...',  // opcional, para edición
//     onChange: (blob) => { ... }       // se llama al capturar/quitar
//   });
//   const blob = await ctrl.getBlob();   // Blob JPEG o null si no hay foto
//   ctrl.reset();                        // limpiar
//
// Requisitos:
//   • Se debe ejecutar sobre HTTPS para que la cámara funcione.
// ─────────────────────────────────────────────────────────────────────

export function montarCapturaFoto(host, { fotoExistenteUrl = null, onChange = () => {} } = {}) {
  if (!host) throw new Error('host requerido');
  host.innerHTML = `
    <div class="cf-wrap">
      <div class="cf-preview" data-preview>
        ${fotoExistenteUrl
          ? `<img src="${escapeAttr(fotoExistenteUrl)}" alt="Foto actual">`
          : `<div class="cf-empty">📷 Sin foto</div>`}
      </div>
      <video class="cf-video" data-video playsinline autoplay muted style="display:none"></video>
      <canvas class="cf-canvas" data-canvas style="display:none"></canvas>
      <div class="cf-actions">
        <button type="button" class="cf-btn cf-btn-primary" data-camera>📸 Tomar foto</button>
        <label class="cf-btn cf-btn-ghost">
          📁 Subir archivo
          <input type="file" accept="image/*" capture="environment" data-file style="display:none">
        </label>
        <button type="button" class="cf-btn cf-btn-ghost" data-clear style="display:none">Quitar</button>
        <button type="button" class="cf-btn cf-btn-success" data-snap style="display:none">✓ Capturar</button>
        <button type="button" class="cf-btn cf-btn-ghost" data-stop style="display:none">Cancelar</button>
      </div>
    </div>
  `;
  if (!document.getElementById('cf-styles')) {
    const style = document.createElement('style');
    style.id = 'cf-styles';
    style.textContent = `
      .cf-wrap { display: flex; flex-direction: column; gap: 0.6rem; }
      .cf-preview { width: 100%; max-width: 260px; aspect-ratio: 3/4; background: var(--gray-50,#F7FAFC); border: 2px dashed var(--gray-100,#EEF3F7); border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .cf-preview img { width: 100%; height: 100%; object-fit: cover; }
      .cf-empty { color: var(--gray-500,#6B7280); font-size: 0.85rem; }
      .cf-video, .cf-canvas { width: 100%; max-width: 260px; aspect-ratio: 3/4; object-fit: cover; border-radius: 12px; background: #000; }
      .cf-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .cf-btn { border: none; cursor: pointer; padding: 0.5rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; font-family: inherit; display: inline-flex; align-items: center; gap: 4px; }
      .cf-btn-primary { background: linear-gradient(135deg, var(--blue,#1E6FB3), var(--blue-dark,#0E3D6E)); color: white; }
      .cf-btn-ghost { background: transparent; color: var(--gray-600,#4B5563); border: 1.5px solid var(--gray-100,#EEF3F7); }
      .cf-btn-success { background: linear-gradient(135deg, var(--green,#4FB3A2), var(--green-dark,#2F8D7B)); color: white; }
    `;
    document.head.appendChild(style);
  }

  const preview = host.querySelector('[data-preview]');
  const video   = host.querySelector('[data-video]');
  const canvas  = host.querySelector('[data-canvas]');
  const fileInp = host.querySelector('[data-file]');
  const btnCam  = host.querySelector('[data-camera]');
  const btnSnap = host.querySelector('[data-snap]');
  const btnStop = host.querySelector('[data-stop]');
  const btnClear= host.querySelector('[data-clear]');

  let stream = null;
  let currentBlob = null;
  if (fotoExistenteUrl) btnClear.style.display = '';

  async function abrirCamara() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false
      });
      video.srcObject = stream;
      video.style.display = '';
      preview.style.display = 'none';
      btnCam.style.display = 'none';
      fileInp.parentElement.style.display = 'none';
      btnSnap.style.display = '';
      btnStop.style.display = '';
    } catch (err) {
      alert('No se pudo acceder a la cámara: ' + err.message + '\n\nPuedes usar "Subir archivo" en su lugar.');
    }
  }

  function detenerCamara() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video.style.display = 'none';
    preview.style.display = '';
    btnCam.style.display = '';
    fileInp.parentElement.style.display = '';
    btnSnap.style.display = 'none';
    btnStop.style.display = 'none';
  }

  function capturarDeVideo() {
    const w = video.videoWidth, h = video.videoHeight;
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      currentBlob = blob;
      mostrarBlob(blob);
      detenerCamara();
      onChange(blob);
    }, 'image/jpeg', 0.85);
  }

  function mostrarBlob(blob) {
    const url = URL.createObjectURL(blob);
    preview.innerHTML = `<img src="${url}" alt="Foto capturada">`;
    btnClear.style.display = '';
  }

  function limpiar() {
    currentBlob = null;
    preview.innerHTML = fotoExistenteUrl
      ? `<img src="${escapeAttr(fotoExistenteUrl)}" alt="Foto actual">`
      : `<div class="cf-empty">📷 Sin foto</div>`;
    btnClear.style.display = fotoExistenteUrl ? '' : 'none';
    onChange(null);
  }

  btnCam.addEventListener('click', abrirCamara);
  btnStop.addEventListener('click', detenerCamara);
  btnSnap.addEventListener('click', capturarDeVideo);
  btnClear.addEventListener('click', limpiar);
  fileInp.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    currentBlob = f;
    mostrarBlob(f);
    onChange(f);
  });

  return {
    async getBlob() { return currentBlob; },
    reset() { limpiar(); detenerCamara(); }
  };
}

function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}
