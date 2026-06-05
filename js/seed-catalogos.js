// ── Script de Semilla — Catálogos de Reina María IPS ──
// Carga ~50 recomendaciones extraídas del PDF "RECOMENDACIONES.xlsx"
// agrupadas por categoría. Pensado para correrse UNA SOLA VEZ por un admin.
//
// CÓMO EJECUTARLO:
//   1. Abre dashboard-empleado.html logueado como ADMIN.
//   2. Abre la consola del navegador (F12 → Console).
//   3. Pega esto:
//        import('./js/seed-catalogos.js').then(m => m.sembrarCatalogos());
//   4. Espera el mensaje "✓ Semilla completada".
//
// Es idempotente: si vuelves a correrlo, no duplica (usa IDs determinísticos).

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Recomendaciones agrupadas por categoría
export const RECOMENDACIONES_SEMILLA = [
  // ── EPP ──
  { categoria: 'epp', texto: 'Usar los EPP adecuados de acuerdo al programa del SG-SST de la empresa.' },
  { categoria: 'epp', texto: 'Utilizar protección cuando haya exposición a productos químicos.' },
  { categoria: 'epp', texto: 'Protección respiratoria en ambientes contaminantes.' },
  { categoria: 'epp', texto: 'Utilizar protección auditiva en espacios ruidosos.' },

  // ── OSTEOMUSCULAR / CARGAS ──
  { categoria: 'osteomuscular', texto: 'Aplicar técnicas adecuadas para levantar, halar o empujar cargas.' },
  { categoria: 'osteomuscular', texto: 'Levantar cargas flexionando rodillas y no la espalda; evitar sobrepasar 25 kg sin ayuda.' },
  { categoria: 'osteomuscular', texto: 'Realizar pausas activas con ejercicios de estiramiento para tronco, muñecas y brazos.' },
  { categoria: 'osteomuscular', texto: 'Alternar tareas para evitar movimientos repetitivos de flexo-extensión o rotación de manos.' },
  { categoria: 'osteomuscular', texto: 'Realizar micropausas de 5 minutos cada hora para ejercicios de estiramiento.' },
  { categoria: 'osteomuscular', texto: 'Capacitar e implementar medidas de higiene postural.' },
  { categoria: 'osteomuscular', texto: 'Evitar tiempos prolongados en posición sedente.' },
  { categoria: 'osteomuscular', texto: 'Pausas activas cada 2 horas por 10 minutos; ejercicios de estiramiento y relajación.' },
  { categoria: 'osteomuscular', texto: 'Capacitar en técnicas adecuadas y seguras de levantamiento de cargas.' },
  { categoria: 'osteomuscular', texto: 'Uso de faja abdominal (en casos indicados).' },

  // ── VISUAL ──
  { categoria: 'visual', texto: 'Realizar control con optometría.' },
  { categoria: 'visual', texto: 'Utilizar protección visual con lentes de alto filtro.' },
  { categoria: 'visual', texto: 'Mantener adecuada iluminación en el área de trabajo; evitar fatiga visual con pausas.' },
  { categoria: 'visual', texto: 'Tomar pausas visuales cada 20 minutos mirando un punto lejano durante 20 segundos.' },
  { categoria: 'visual', texto: 'Usar corrección óptica con anteojos según indicación del optómetra tratante.' },
  { categoria: 'visual', texto: 'Ajustar la altura de la silla y la pantalla del computador para mantener postura ergonómica.' },

  // ── AUDITIVO ──
  { categoria: 'auditivo', texto: 'Uso de protección auditiva (tapones o cascos) en entornos ruidosos.' },
  { categoria: 'auditivo', texto: 'Paciente con alteración auditiva: dar órdenes por escrito y tener señales de emergencia visuales.' },
  { categoria: 'auditivo', texto: 'Realizar chequeos auditivos periódicos para evaluar cambios en la audición.' },

  // ── CARDIOVASCULAR / METABÓLICO ──
  { categoria: 'cardiovascular', texto: 'Requiere tratamiento farmacológico para dislipidemia — control y seguimiento por su EPS.' },
  { categoria: 'cardiovascular', texto: 'Requiere tratamiento farmacológico para hipertrigliceridemia — control y seguimiento por su EPS.' },
  { categoria: 'cardiovascular', texto: 'Control y seguimiento farmacológico por su IPS para manejo de hipertensión arterial.' },
  { categoria: 'cardiovascular', texto: 'Disminución y control de peso corporal; hábitos saludables y actividad física regular 3 veces por semana mínimo 30 minutos.' },
  { categoria: 'cardiovascular', texto: 'Patología crónica controlada. Continuar controles por EPS. Ingreso PVE Cardiovascular.' },
  { categoria: 'cardiovascular', texto: 'Seguimiento por EPS por hallazgos médicos; evitar bebidas y alimentos altos en azúcar para reducir hiperglicemia.' },

  // ── PAUSAS ACTIVAS / RESPIRACIÓN ──
  { categoria: 'pausas_activas', texto: 'Realizar pausas activas con ejercicios de respiración controlada para mejorar capacidad pulmonar.' },
  { categoria: 'pausas_activas', texto: 'Realizar ejercicios de movilidad para pies, pantorrillas, piernas y caderas.' },
  { categoria: 'pausas_activas', texto: 'Estiramientos de cuello y hombros cada 2 horas para prevenir dolores musculares.' },

  // ── MANIPULADORES DE ALIMENTOS ──
  { categoria: 'manipuladores', texto: 'Participar en cursos y talleres sobre seguridad alimentaria para mantenerse actualizado en buenas prácticas.' },
  { categoria: 'manipuladores', texto: 'Mantener manos, uñas y uniforme siempre limpios para evitar contaminación de alimentos.' },
  { categoria: 'manipuladores', texto: 'Utilizar gorro, guantes y mascarilla según lo requiera la tarea; cambiarlos con frecuencia.' },

  // ── CONDUCTORES ──
  { categoria: 'conductores', texto: 'Mantener adecuada higiene postural al conducir, ajustando asiento, respaldo y volante.' },
  { categoria: 'conductores', texto: 'Adquirir hábitos saludables de sueño y descanso.' },
  { categoria: 'conductores', texto: 'Usar corrección óptica con anteojos de forma permanente.' },

  // ── ALTURAS / ESPACIOS CONFINADOS ──
  { categoria: 'alturas', texto: 'Restringido temporalmente para trabajo en alturas.' },
  { categoria: 'alturas', texto: 'Control post-tratamiento para levantar restricción.' },
  { categoria: 'alturas', texto: 'Pruebas complementarias para trabajo en alturas: vértigo y equilibrio satisfactorios.' },

  // ── QUÍMICOS / RESPIRATORIO ──
  { categoria: 'respiratorio', texto: 'Uso estricto de mascarilla nasobucal; lavado frecuente de manos; desinfección de superficies.' },
  { categoria: 'respiratorio', texto: 'Humectar la piel, en especial las manos, antes, durante y después de la jornada laboral.' },

  // ── HALLAZGOS / SEGUIMIENTO EPS ──
  { categoria: 'seguimiento_eps', texto: 'Control y seguimiento por su IPS para manejo y estudio de hernia umbilical.' },
  { categoria: 'seguimiento_eps', texto: 'Remitir a programa de promoción y prevención por EPS (cáncer de mama).' },
  { categoria: 'seguimiento_eps', texto: 'Refiere síntomas osteomusculares; se envía a valoración médica EPS. Ingresar PVE osteomuscular.' },
  { categoria: 'seguimiento_eps', texto: 'Por síntomas y hallazgos en prueba médica, se recomienda seguimiento médico por EPS.' },

  // ── VARICES ──
  { categoria: 'varices', texto: 'Uso de medias antivárice de baja compresión elástica.' },

  // ── HÁBITOS / ESTILO DE VIDA ──
  { categoria: 'habitos', texto: 'Dejar el hábito de fumar.' },
  { categoria: 'habitos', texto: 'Mejorar los hábitos alimenticios; realizar actividad física frecuente.' },
  { categoria: 'habitos', texto: 'Disminuir consumo de alcohol.' },
  { categoria: 'habitos', texto: 'Mantener una correcta hidratación durante la jornada laboral bebiendo al menos 6 vasos de agua al día.' },
  { categoria: 'habitos', texto: 'Adoptar una alimentación equilibrada rica en frutas, verduras, cereales integrales y proteínas magras; evitar ultraprocesados, exceso de sal y azúcares.' },
  { categoria: 'habitos', texto: 'Practicar una alimentación balanceada rica en proteínas y carbohidratos.' },
  { categoria: 'habitos', texto: 'Control de peso corporal.' },

  // ── PROTECCIÓN SOLAR ──
  { categoria: 'solar', texto: 'Uso de medidas antisolares: aplicar protector solar FPS ≥30 y complementar con ropa y accesorios.' },

  // ── PRESBICIA ──
  { categoria: 'presbicia', texto: 'Pacientes con presbicia: usar gafas de seguridad con filtros adecuados durante labores con riesgo visual.' },
  { categoria: 'presbicia', texto: 'Realizar ejercicios oculares: descansos cada 15 minutos, fijar mirada lejana, círculos con la vista.' }
];

// Laboratorios extraídos del PDF (precios los carga el admin después)
export const LABORATORIOS_SEMILLA = [
  { nombre: 'Cuadro hemático',         precio: null, activo: true },
  { nombre: 'Glicemia',                precio: null, activo: true },
  { nombre: 'PT y PTT',                precio: null, activo: true },
  { nombre: 'VIH',                     precio: null, activo: true },
  { nombre: 'VDRL',                    precio: null, activo: true },
  { nombre: 'Prueba de embarazo',      precio: null, activo: true },
  { nombre: 'Electrocardiograma',      precio: null, activo: true },
  { nombre: 'Colesterol total',        precio: null, activo: true },
  { nombre: 'Triglicéridos',           precio: null, activo: true },
  { nombre: 'Perfil lipídico completo',precio: null, activo: true }
];

// Función principal
export async function sembrarCatalogos() {
  console.log('🌱 Iniciando semilla de catálogos...');
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Recomendaciones
  let i = 1;
  for (const rec of RECOMENDACIONES_SEMILLA) {
    const id = `${rec.categoria}_${String(i).padStart(3, '0')}`;
    await setDoc(doc(db, 'catalogos', 'recomendaciones', 'items', id), {
      ...rec,
      activo: true,
      orden: i,
      seedAt: serverTimestamp()
    }, { merge: true });
    i++;
  }
  console.log(`✓ ${RECOMENDACIONES_SEMILLA.length} recomendaciones cargadas.`);

  // Laboratorios
  let j = 1;
  for (const lab of LABORATORIOS_SEMILLA) {
    const id = `lab_${String(j).padStart(3, '0')}`;
    await setDoc(doc(db, 'catalogos', 'laboratorios', 'items', id), {
      ...lab,
      orden: j,
      seedAt: serverTimestamp()
    }, { merge: true });
    j++;
  }
  console.log(`✓ ${LABORATORIOS_SEMILLA.length} laboratorios cargados.`);

  console.log('✓ Semilla completada. Revisa Firestore Console → /catalogos/');
  return { recomendaciones: RECOMENDACIONES_SEMILLA.length, laboratorios: LABORATORIOS_SEMILLA.length };
}
