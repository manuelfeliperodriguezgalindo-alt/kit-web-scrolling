// ─────────────────────────────────────────────────────────────────────
// Reina María IPS · Generación PDF del Concepto de Aptitud Laboral
// ─────────────────────────────────────────────────────────────────────
// Usa jsPDF puro (sin html2canvas) para producir un PDF de texto
// seleccionable, ~50KB, profesional. Diseño basado en formato F-43.
//
// Carga jsPDF dinámicamente desde CDN (no se incluye en el bundle de cada
// página: solo se descarga cuando alguien genera un PDF).
// ─────────────────────────────────────────────────────────────────────

import { loadScript } from './utils.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { STORAGE_PATHS } from './firebase-config.js';

const JSPDF_CDN = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';

// ── Cargar imagen a dataURL (necesario para meter logo y firmas en jsPDF) ──
async function fetchImageAsDataURL(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('No se pudo cargar imagen para PDF:', url, err);
    return null;
  }
}

// ── Util: obtener checks "marcados" como string legible ──
function listaCheckMarcados(obj, labelMap) {
  if (!obj) return [];
  return Object.entries(labelMap)
    .filter(([k]) => obj[k] === true || (obj[k] && obj[k].marcado))
    .map(([, v]) => v);
}

// ── Layout: dibuja el PDF y devuelve un Blob ──
async function dibujarPDF({ cap, paciente, medico, empresa, logoDataUrl, fotoDataUrl, firmaMedicoDataUrl, firmaTrabajadorDataUrl }) {
  // eslint-disable-next-line no-undef
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
  const PAGE_W = pdf.internal.pageSize.getWidth();
  const PAGE_H = pdf.internal.pageSize.getHeight();
  const MARGIN = 14;
  let y = MARGIN;

  // ── HEADER ──
  if (logoDataUrl) {
    try { pdf.addImage(logoDataUrl, 'PNG', MARGIN, y, 20, 20); } catch (_) {}
  }
  pdf.setFont('helvetica', 'bold').setFontSize(14).setTextColor(14, 61, 110);
  pdf.text('REINA MARÍA IPS', MARGIN + 24, y + 7);
  pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(80, 80, 80);
  pdf.text('Carrera 16 #14-54, Duitama, Boyacá · NIT pendiente', MARGIN + 24, y + 12);
  pdf.text('Habilitación: pendiente · reinamariaips.com', MARGIN + 24, y + 16);
  // Caja folio
  pdf.setDrawColor(14, 61, 110).setLineWidth(0.4);
  pdf.rect(PAGE_W - MARGIN - 60, y, 60, 20);
  pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(14, 61, 110);
  pdf.text('CONCEPTO DE APTITUD', PAGE_W - MARGIN - 57, y + 5);
  pdf.setFont('helvetica', 'bold').setFontSize(12);
  pdf.text(cap.folio || '—', PAGE_W - MARGIN - 57, y + 11);
  pdf.setFont('helvetica', 'normal').setFontSize(7).setTextColor(120, 120, 120);
  const fechaTxt = cap.fecha ? new Date(cap.fecha.toDate ? cap.fecha.toDate() : cap.fecha).toLocaleDateString('es-CO') : '';
  pdf.text('Fecha: ' + fechaTxt, PAGE_W - MARGIN - 57, y + 17);
  y += 26;

  // ── DATOS DEL TRABAJADOR ──
  pdf.setDrawColor(220, 220, 220).setLineWidth(0.2);
  pdf.setFillColor(234, 243, 251);
  pdf.rect(MARGIN, y, PAGE_W - MARGIN * 2, 6, 'F');
  pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(14, 61, 110);
  pdf.text('DATOS DEL TRABAJADOR', MARGIN + 2, y + 4);
  y += 7;

  // Foto (si hay) a la derecha
  const fotoX = PAGE_W - MARGIN - 30;
  if (fotoDataUrl) {
    try { pdf.addImage(fotoDataUrl, 'JPEG', fotoX, y, 28, 35); } catch (_) {}
    pdf.setDrawColor(180, 180, 180); pdf.rect(fotoX, y, 28, 35);
  }

  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0, 0, 0);
  const nombreCompleto = `${paciente?.nombres || ''} ${paciente?.apellidos || ''}`.trim() || (cap.trabajador_snapshot?.nombres + ' ' + cap.trabajador_snapshot?.apellidos);
  const tipoDoc = paciente?.tipo_documento || cap.trabajador_snapshot?.tipo_documento || 'CC';
  const numDoc  = paciente?.numero_documento || cap.trabajador_snapshot?.numero_documento || '';

  const lineas = [
    ['Nombres y apellidos:', nombreCompleto],
    ['Documento:', `${tipoDoc} ${numDoc}`],
    ['Fecha de nacimiento:', paciente?.fecha_nacimiento || '—'],
    ['Sexo:', paciente?.sexo || cap.trabajador_snapshot?.sexo || '—'],
    ['Cargo:', paciente?.cargo || cap.trabajador_snapshot?.cargo || '—'],
    ['Empresa:', empresa?.razon_social || cap.trabajador_snapshot?.empresa_nombre || '—'],
    ['Actividad económica:', empresa?.actividad_economica || '—']
  ];
  lineas.forEach(([k, v]) => {
    pdf.setFont('helvetica', 'bold').text(k, MARGIN, y + 4);
    pdf.setFont('helvetica', 'normal').text(String(v || '—').slice(0, 70), MARGIN + 38, y + 4);
    y += 5;
  });
  // Avanzar si la foto fue más alta
  if (fotoDataUrl) y = Math.max(y, MARGIN + 7 + 36 + 6); else y += 2;

  // ── TIPO DE EXAMEN ──
  pdf.setFillColor(234, 243, 251);
  pdf.rect(MARGIN, y, PAGE_W - MARGIN * 2, 6, 'F');
  pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(14, 61, 110);
  pdf.text('TIPO DE EXAMEN', MARGIN + 2, y + 4); y += 7;
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0, 0, 0);
  const tipos = listaCheckMarcados(cap.tipo_examen, {
    ingreso: 'Ingreso', periodico: 'Periódico', egreso: 'Egreso',
    trabajo_alturas: 'Trabajo en alturas', espacios_confinados: 'Espacios confinados',
    manipulacion_alimentos: 'Manipulación de alimentos', otro: 'Otro'
  });
  pdf.text(tipos.join(' · ') || '—', MARGIN, y + 4);
  if (cap.tipo_examen?.otro?.marcado && cap.tipo_examen.otro.descripcion) {
    y += 5; pdf.text('Otro: ' + cap.tipo_examen.otro.descripcion, MARGIN, y + 4);
  }
  y += 8;

  // ── EXÁMENES REALIZADOS ──
  pdf.setFillColor(234, 243, 251);
  pdf.rect(MARGIN, y, PAGE_W - MARGIN * 2, 6, 'F');
  pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(14, 61, 110);
  pdf.text('EXÁMENES REALIZADOS', MARGIN + 2, y + 4); y += 7;
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0, 0, 0);
  const exam = cap.examenes_realizados || {};
  const exLines = [];
  if (exam.medico_ocupacional?.realizado) exLines.push('Examen Médico Ocupacional' + (exam.medico_ocupacional.enfasis_osteomuscular ? ' (énfasis osteomuscular)' : ''));
  if (exam.audiometria)          exLines.push('Audiometría');
  if (exam.visiometria)          exLines.push('Visiometría');
  if (exam.examen_optometrico)   exLines.push('Examen Optométrico');
  if (exam.espirometria)         exLines.push('Espirometría');
  if (exam.prueba_psicologica)   exLines.push('Prueba Psicológica');
  if (exam.psicosensometrico)    exLines.push('Psicosensométrico');
  if (exam.otros?.realizado)     exLines.push('Otros: ' + (exam.otros.cual || ''));
  pdf.text(exLines.join(' · ') || '—', MARGIN, y + 4, { maxWidth: PAGE_W - MARGIN * 2 }); y += 6;
  if (exam.laboratorios_tomados) {
    pdf.setFont('helvetica', 'bold').text('Laboratorios:', MARGIN, y + 4);
    pdf.setFont('helvetica', 'normal').text(exam.laboratorios_tomados, MARGIN + 22, y + 4); y += 6;
  }
  y += 3;

  // ── CONCEPTO ──
  pdf.setFillColor(230, 244, 241);
  pdf.rect(MARGIN, y, PAGE_W - MARGIN * 2, 6, 'F');
  pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(47, 141, 123);
  pdf.text('CONCEPTO DE VALORACIÓN MÉDICA', MARGIN + 2, y + 4); y += 7;
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0, 0, 0);
  const concepto = cap.concepto_valoracion || {};
  const conceptos = [];
  if (concepto.apto_desempenar_cargo)        conceptos.push('✓ Apto para desempeñar el cargo');
  if (concepto.sin_patologia_aparente)       conceptos.push('✓ Sin patología aparente');
  if (concepto.apto_trabajar_alturas)        conceptos.push('✓ Apto para trabajar en alturas');
  if (concepto.apto_espacios_confinados)     conceptos.push('✓ Apto para espacios confinados');
  if (concepto.apto_con_recomendaciones)     conceptos.push('✓ Apto con recomendaciones');
  if (concepto.con_patologia_no_limita)      conceptos.push('✓ Con patología que no lo limita');
  if (concepto.apto_trabajo_electrico)       conceptos.push('✓ Apto para trabajo eléctrico');
  if (concepto.puede_continuar_labor)        conceptos.push('✓ Puede continuar su labor');
  if (concepto.apto_manipulacion_alimentos)  conceptos.push('✓ Apto para manipulación de alimentos');
  if (concepto.aplazado)                     conceptos.push('⏸ Aplazado');
  conceptos.forEach(c => { pdf.text(c, MARGIN, y + 4); y += 5; });
  if (concepto.observaciones) {
    y += 1; pdf.setFont('helvetica', 'italic').text('Observaciones: ' + concepto.observaciones, MARGIN, y + 4, { maxWidth: PAGE_W - MARGIN * 2 });
    y += 5; pdf.setFont('helvetica', 'normal');
  }
  y += 3;

  // ── RECOMENDACIONES ──
  pdf.setFillColor(255, 248, 225);
  pdf.rect(MARGIN, y, PAGE_W - MARGIN * 2, 6, 'F');
  pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(154, 84, 0);
  pdf.text('RECOMENDACIONES', MARGIN + 2, y + 4); y += 7;
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0, 0, 0);
  const recos = (cap.recomendaciones_lista || []);
  if (recos.length === 0) {
    pdf.text('Sin recomendaciones específicas.', MARGIN, y + 4); y += 6;
  } else {
    recos.forEach(r => {
      const lines = pdf.splitTextToSize('• ' + r, PAGE_W - MARGIN * 2);
      lines.forEach(line => { pdf.text(line, MARGIN, y + 4); y += 5; });
      // Salto de página si nos pasamos
      if (y > PAGE_H - 50) { pdf.addPage(); y = MARGIN; }
    });
  }
  if (cap.observaciones_generales) {
    y += 2; pdf.setFont('helvetica', 'bold').text('Observaciones generales:', MARGIN, y + 4); y += 5;
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(cap.observaciones_generales, PAGE_W - MARGIN * 2);
    lines.forEach(line => { pdf.text(line, MARGIN, y + 4); y += 5; });
  }
  y += 6;

  // ── FIRMAS ──
  // Si la firma se sale de página, salto
  if (y > PAGE_H - 55) { pdf.addPage(); y = MARGIN; }
  const colW = (PAGE_W - MARGIN * 2 - 10) / 2;
  // Médico
  pdf.setDrawColor(120, 120, 120); pdf.line(MARGIN, y + 22, MARGIN + colW, y + 22);
  if (firmaMedicoDataUrl) {
    try { pdf.addImage(firmaMedicoDataUrl, 'PNG', MARGIN + 5, y + 3, colW - 10, 18); } catch (_) {}
  }
  pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(80, 80, 80);
  pdf.text('Firma del médico evaluador', MARGIN, y + 26);
  pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(0, 0, 0);
  const medNombre = `${medico?.nombres || ''} ${medico?.apellidos || ''}`.trim() || cap.firmas?.medico?.nombre || '';
  pdf.text(medNombre, MARGIN, y + 30);
  if (medico?.registro_profesional) {
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(80, 80, 80);
    pdf.text('Reg. prof.: ' + medico.registro_profesional, MARGIN, y + 34);
  }
  // Trabajador
  const colX2 = MARGIN + colW + 10;
  pdf.line(colX2, y + 22, colX2 + colW, y + 22);
  if (firmaTrabajadorDataUrl) {
    try { pdf.addImage(firmaTrabajadorDataUrl, 'PNG', colX2 + 5, y + 3, colW - 10, 18); } catch (_) {}
  }
  pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(80, 80, 80);
  pdf.text('Firma del trabajador (recibido)', colX2, y + 26);
  pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(0, 0, 0);
  pdf.text(nombreCompleto, colX2, y + 30);
  pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(80, 80, 80);
  pdf.text(`${tipoDoc} ${numDoc}`, colX2, y + 34);

  // ── PIE DE PÁGINA ──
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal').setFontSize(7).setTextColor(150, 150, 150);
    pdf.text('Documento generado electrónicamente · Folio ' + (cap.folio || '') + ' · Página ' + i + ' de ' + totalPages, PAGE_W / 2, PAGE_H - 6, { align: 'center' });
  }

  return pdf.output('blob');
}

// ── API pública ──
export async function generarYSubirPDFCap(app, { cap, paciente, medico, empresa, logoUrl }) {
  await loadScript(JSPDF_CDN);
  const [logoDataUrl, fotoDataUrl, firmaMedicoDataUrl, firmaTrabajadorDataUrl] = await Promise.all([
    fetchImageAsDataURL(logoUrl || (location.origin + '/assets/logo.png')),
    fetchImageAsDataURL(paciente?.foto_url || cap.trabajador_snapshot?.foto_url),
    fetchImageAsDataURL(medico?.firma_url || cap.firmas?.medico?.firma_url),
    fetchImageAsDataURL(paciente?.firma_url || cap.trabajador_snapshot?.firma_url)
  ]);
  const blob = await dibujarPDF({ cap, paciente, medico, empresa, logoDataUrl, fotoDataUrl, firmaMedicoDataUrl, firmaTrabajadorDataUrl });

  // Subir a Storage
  const storage = getStorage(app);
  const r = ref(storage, STORAGE_PATHS.capPdf(cap.folio));
  await uploadBytes(r, blob, { contentType: 'application/pdf' });
  const url = await getDownloadURL(r);
  return { blob, url };
}

// ── API local: solo generar y abrir (útil para preview sin subir) ──
export async function previsualizarPDFCap({ cap, paciente, medico, empresa, logoUrl }) {
  await loadScript(JSPDF_CDN);
  const [logoDataUrl, fotoDataUrl, firmaMedicoDataUrl, firmaTrabajadorDataUrl] = await Promise.all([
    fetchImageAsDataURL(logoUrl || (location.origin + '/assets/logo.png')),
    fetchImageAsDataURL(paciente?.foto_url || cap.trabajador_snapshot?.foto_url),
    fetchImageAsDataURL(medico?.firma_url || cap.firmas?.medico?.firma_url),
    fetchImageAsDataURL(paciente?.firma_url || cap.trabajador_snapshot?.firma_url)
  ]);
  const blob = await dibujarPDF({ cap, paciente, medico, empresa, logoDataUrl, fotoDataUrl, firmaMedicoDataUrl, firmaTrabajadorDataUrl });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
