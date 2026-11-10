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

export const pickResponse = (last) => (last.includes('mapa mental') ? RESPONSES.mindmap : last.startsWith('Resume el video') || last.includes('puntos clave') ? RESPONSES.summary
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

