/* Contenido de ejemplo compartido por las imágenes de la tienda y del carrusel de LinkedIn. */
export const VIDEO_ID = 'demoVideo01';
export const TITLE = 'Cómo aprender cualquier idioma en 6 meses';
export const LINES = [
  [0, 'Hola a todos, bienvenidos de nuevo al canal.'],
  [4, 'Hoy les voy a contar el método exacto que usé para aprender tres idiomas'],
  [9, 'y que cualquiera puede aplicar en solo seis meses.'],
  [14, 'Lo primero que tienen que entender es que la constancia gana a la intensidad.'],
  [21, 'Es mejor estudiar treinta minutos todos los días que cinco horas un domingo.'],
  [72, 'El primer pilar es la exposición diaria al idioma.'],
  [77, 'Escuchen podcasts, miren series con subtítulos en el idioma original.'],
  [84, 'Su cerebro necesita acostumbrarse a los sonidos antes de poder producirlos.'],
  [150, 'El segundo pilar es hablar desde el primer día, aunque sea con errores.'],
  [157, 'Busquen un compañero de intercambio o un profesor online.'],
  [165, 'El miedo a equivocarse es el mayor freno para la mayoría de las personas.'],
  [245, 'El tercer pilar es la repetición espaciada para el vocabulario.'],
  [251, 'Con aplicaciones de flashcards pueden aprender veinte palabras nuevas por día.'],
  [259, 'En seis meses son más de tres mil seiscientas palabras.'],
  [340, 'Las primeras mil palabras más frecuentes cubren cerca del ochenta por ciento'],
  [346, 'de lo que van a escuchar en conversaciones cotidianas.'],
  [420, 'Un error muy común es estudiar solo gramática con libros.'],
  [426, 'La gramática se entiende mucho mejor después de haber escuchado mucho.'],
  [510, 'Mi rutina diaria era simple: quince minutos de flashcards por la mañana,'],
  [516, 'un podcast en el viaje al trabajo y una conversación de media hora por la noche.'],
  [600, 'Midan su progreso cada mes grabándose mientras hablan.'],
  [606, 'Escucharse después de unas semanas es increíblemente motivador.'],
  [690, 'Resumiendo: exposición diaria, hablar desde el día uno y repetición espaciada.'],
  [698, 'Si les sirvió, cuéntenme en los comentarios qué idioma están aprendiendo.'],
];

export const RESPONSES = {
  mindmap: [
    '- Aprender un idioma en 6 meses',
    '  - Exposición diaria [01:12]',
    '    - Podcasts en el viaje',
    '    - Series en versión original',
    '  - Hablar desde el día uno [02:30]',
    '    - Perder el miedo a equivocarse',
    '    - Intercambio de idiomas',
    '  - Repetición espaciada [04:05]',
    '    - 20 palabras por día',
    '    - 1.000 palabras = 80% del uso',
    '  - Rutina de 60 minutos [08:30]',
    '    - Flashcards por la mañana',
    '    - Conversación por la noche',
    '  - Medir el progreso [10:00]',
    '    - Grabarse cada mes',
  ].join('\n'),
  summary: `**TL;DR:** Aprender un idioma en 6 meses es posible combinando exposición diaria, práctica oral desde el primer día y repetición espaciada del vocabulario.

## Resumen
El autor explica el método que usó para aprender tres idiomas. La idea central es que **la constancia vale más que la intensidad**: 30 minutos diarios rinden más que largas sesiones esporádicas.

El método se apoya en tres pilares y una rutina diaria sencilla que se puede sostener durante meses.

## Ideas principales
- Exposición diaria con podcasts y series en versión original [01:12]
- Hablar desde el primer día, aunque haya errores [02:30]
- Flashcards con repetición espaciada: 20 palabras por día [04:05]
- Las 1.000 palabras más frecuentes cubren ~80% de las conversaciones [05:40]
- Grabarse cada mes para medir el progreso [10:00]

## Conclusión
Con una rutina de unos 60 minutos diarios repartidos en el día, el progreso en seis meses es enorme.`,
  chapters: `- [00:00] **Introducción** — El método para aprender idiomas en 6 meses.
- [01:12] **Exposición diaria** — Podcasts y series para entrenar el oído.
- [02:30] **Hablar desde el día uno** — Perder el miedo a equivocarse.
- [04:05] **Repetición espaciada** — Flashcards y vocabulario frecuente.
- [07:00] **El error de la gramática** — Por qué no empezar por los libros.
- [08:30] **Rutina diaria** — Cómo repartir 60 minutos al día.
- [10:00] **Medir el progreso** — Grabarse cada mes.
- [11:30] **Resumen final**`,
  chat: `Según el video, la rutina diaria tiene **tres momentos** [08:30]:

1. **Mañana:** 15 minutos de flashcards con repetición espaciada.
2. **Viaje al trabajo:** escuchar un podcast en el idioma.
3. **Noche:** 30 minutos de conversación con un compañero o profesor.

El autor insiste en que lo importante es hacerlo **todos los días** [00:21].`,
};

/** Respuestas estructuradas (JSON) para las vistas gráficas. */
export const STRUCTURED = {
  '"tldr"': {
    tldr: 'Aprender un idioma en 6 meses es posible combinando exposición diaria, práctica oral desde el primer día y repetición espaciada del vocabulario.',
    sections: [
      { title: 'La constancia gana a la intensidad', text: 'El autor explica que 30 minutos diarios rinden más que largas sesiones esporádicas. El hábito es lo que sostiene el progreso durante meses.' },
      { title: 'Los tres pilares del método', text: 'Exposición diaria al idioma, hablar desde el primer día aunque haya errores y repetición espaciada para fijar el vocabulario más frecuente.' },
      { title: 'Una rutina simple', text: 'Flashcards por la mañana, un podcast en el viaje al trabajo y media hora de conversación por la noche.' },
    ],
    keyIdeas: [
      { text: 'Exposición diaria con podcasts y series en versión original', t: '01:12' },
      { text: 'Hablar desde el primer día, aunque haya errores', t: '02:30' },
      { text: 'Flashcards con repetición espaciada: 20 palabras por día', t: '04:05' },
      { text: 'Las 1.000 palabras más frecuentes cubren ~80% de las conversaciones', t: '05:40' },
      { text: 'Grabarse cada mes para medir el progreso', t: '10:00' },
    ],
    conclusion: 'Con una rutina de unos 60 minutos diarios repartidos en el día, el progreso en seis meses es enorme.',
  },
  '"points"': { points: [
    { title: 'Constancia antes que intensidad', detail: '30 minutos diarios rinden más que cinco horas un domingo.', t: '00:14' },
    { title: 'Exposición diaria', detail: 'Podcasts y series en versión original para entrenar el oído.', t: '01:12' },
    { title: 'Hablar desde el día uno', detail: 'El miedo a equivocarse es el mayor freno; busca intercambio o un profesor.', t: '02:30' },
    { title: 'Repetición espaciada', detail: '20 palabras nuevas por día suman más de 3.600 en seis meses.', t: '04:05' },
    { title: 'Vocabulario frecuente', detail: 'Las primeras 1.000 palabras cubren cerca del 80% de lo cotidiano.', t: '05:40' },
    { title: 'Gramática después', detail: 'Se entiende mejor tras haber escuchado mucho.', t: '07:00' },
  ] },
  '"chapters"': { chapters: [
    { t: '00:00', title: 'Introducción', summary: 'El método para aprender idiomas en 6 meses.' },
    { t: '01:12', title: 'Exposición diaria', summary: 'Podcasts y series para entrenar el oído.' },
    { t: '02:30', title: 'Hablar desde el día uno', summary: 'Perder el miedo a equivocarse.' },
    { t: '04:05', title: 'Repetición espaciada', summary: 'Flashcards y vocabulario frecuente.' },
    { t: '07:00', title: 'El error de la gramática', summary: 'Por qué no empezar por los libros.' },
    { t: '08:30', title: 'Rutina diaria', summary: 'Cómo repartir 60 minutos al día.' },
    { t: '10:00', title: 'Medir el progreso', summary: 'Grabarse cada mes.' },
  ] },
  '"questions"': { questions: [
    { q: 'Según el video, ¿qué es más efectivo para aprender un idioma?', options: ['Estudiar cinco horas los domingos', 'Estudiar 30 minutos todos los días', 'Estudiar solo gramática', 'Esperar a sentirse preparado para hablar'], answer: 1, explanation: 'El autor insiste en que la constancia gana a la intensidad.', t: '00:14' },
    { q: '¿Cuántas palabras nuevas por día propone aprender con flashcards?', options: ['5', '10', '20', '50'], answer: 2, explanation: 'Veinte palabras diarias suman más de 3.600 en seis meses.', t: '04:05' },
    { q: '¿Qué porcentaje de las conversaciones cubren las 1.000 palabras más frecuentes?', options: ['Cerca del 30%', 'Cerca del 50%', 'Cerca del 80%', 'El 100%'], answer: 2, explanation: 'Por eso conviene priorizar el vocabulario frecuente.', t: '05:40' },
  ] },
  '"cards"': { cards: [
    { front: '¿Qué gana a la intensidad al aprender un idioma?', back: 'La constancia: estudiar un poco todos los días.', t: '00:14' },
    { front: '¿Cuáles son los tres pilares del método?', back: 'Exposición diaria, hablar desde el día uno y repetición espaciada.', t: '01:12' },
    { front: '¿Cuántas palabras por día con flashcards?', back: 'Veinte: más de 3.600 en seis meses.', t: '04:05' },
    { front: '¿Cómo medir el progreso?', back: 'Grabándose al hablar una vez por mes.', t: '10:00' },
  ] },
  '"quotes"': { quotes: [
    { text: 'La constancia gana a la intensidad.', t: '00:14', why: 'Resume la idea central del método.' },
    { text: 'El miedo a equivocarse es el mayor freno para la mayoría de las personas.', t: '02:45', why: 'Explica por qué conviene hablar desde el primer día.' },
    { text: 'Escucharse después de unas semanas es increíblemente motivador.', t: '10:06', why: 'Muestra el valor de medir el progreso.' },
  ] },
  '"steps"': { kind: 'tutorial', requirements: ['App de flashcards con repetición espaciada', 'Podcasts o series en el idioma', 'Un compañero de intercambio o profesor'], steps: [
    { title: 'Repasa 20 palabras con flashcards', detail: 'Quince minutos por la mañana, priorizando el vocabulario frecuente.', t: '04:05' },
    { title: 'Escucha un podcast en el viaje', detail: 'Exposición diaria para acostumbrar el oído.', t: '01:12' },
    { title: 'Conversa 30 minutos por la noche', detail: 'Con un compañero de intercambio o un profesor online.', t: '02:30' },
    { title: 'Grábate una vez por mes', detail: 'Compara las grabaciones para ver tu avance.', t: '10:00' },
  ], warnings: ['No empieces solo con gramática y libros', 'No esperes a "estar listo" para hablar'] },
  '"claims"': { claims: [
    { claim: 'Las 1.000 palabras más frecuentes cubren cerca del 80% de las conversaciones cotidianas', t: '05:40', verdict: 'correcto', explanation: 'Coincide con estudios de frecuencia léxica en varios idiomas.' },
    { claim: 'Cualquier persona puede aprender un idioma en seis meses', t: '00:09', verdict: 'dudoso', explanation: 'Depende del idioma, la dedicación y el nivel buscado.' },
    { claim: 'Estudiar gramática primero es un error', t: '07:00', verdict: 'dudoso', explanation: 'Funciona mejor como complemento; no hay consenso absoluto.' },
  ], opinions: ['La gramática se aprende mejor después de escuchar mucho'], missing: ['No cita fuentes para sus cifras', 'No distingue entre idiomas cercanos y lejanos'] },
  '"posts"': { posts: [
    'Aprender un idioma en 6 meses no es magia: es un método. Te lo resumo en un hilo 👇',
    'La regla de oro: la constancia gana a la intensidad. 30 minutos al día rinden más que 5 horas un domingo.',
    'Pilar 1: exposición diaria. Podcasts en el viaje y series en versión original.',
    'Pilar 2: hablar desde el primer día. El miedo a equivocarse es el mayor freno.',
    'Pilar 3: repetición espaciada. 20 palabras por día = más de 3.600 en seis meses.',
    'Mide tu progreso: grábate una vez por mes. Escucharte después de unas semanas motiva muchísimo.',
  ] },
  '"hashtags"': { text: 'Aprendí algo que cambia cómo veo el estudio de idiomas: la constancia gana a la intensidad.\n\nTres ideas que me llevo:\n• Exposición diaria (podcasts y series)\n• Hablar desde el primer día, aunque haya errores\n• Repetición espaciada: 20 palabras por día\n\nLo más interesante: las 1.000 palabras más frecuentes cubren cerca del 80% de lo que escuchamos.\n\n¿Qué idioma estás aprendiendo y cuál es tu rutina?', hashtags: ['Idiomas', 'Aprendizaje', 'Productividad'] },
};

export const pickResponse = (last) => {
  const key = Object.keys(STRUCTURED).find((k) => last.includes(k));
  if (key) return JSON.stringify(STRUCTURED[key]);
  return pickResponseText(last);
};
const pickResponseText = (last) => (last.includes('mapa mental') ? RESPONSES.mindmap : last.startsWith('Resume el video') || last.includes('puntos clave') ? RESPONSES.summary
  : last.includes('capítulos') ? RESPONSES.chapters : RESPONSES.chat);
export const playerResponse = {
  videoDetails: { videoId: VIDEO_ID, title: TITLE, author: 'Aprende+', lengthSeconds: '754' },
  captions: { playerCaptionsTracklistRenderer: {
    captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=es', name: { simpleText: 'Español' }, languageCode: 'es', isTranslatable: true }],
    translationLanguages: [{ languageCode: 'en', languageName: { simpleText: 'Inglés' } }, { languageCode: 'pt', languageName: { simpleText: 'Portugués' } }],
  } },
};
export const initialData = { x: { getTranscriptEndpoint: { params: 'P_ES' } } };
export const transcriptJson = {
  segs: LINES.map(([t, text], i) => ({ transcriptSegmentRenderer: { startMs: String(t * 1000), endMs: String(((LINES[i + 1]?.[0] ?? t + 6)) * 1000), snippet: { runs: [{ text }] } } })),
  footer: { languageMenu: { sortFilterSubMenuRenderer: { subMenuItems: [
    { title: 'Español', selected: true, continuation: { reloadContinuationData: { continuation: 'P_ES' } } },
  ] } } },
};

