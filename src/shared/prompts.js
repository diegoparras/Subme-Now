/* Subme Now — acciones de IA y construcción de prompts. */
(function (root) {
  const LANGUAGES = {
    es: 'español',
    en: 'inglés (English)',
    pt: 'portugués (português)',
    fr: 'francés (français)',
    de: 'alemán (Deutsch)',
    it: 'italiano',
    video: 'el mismo idioma en que está hablado el video',
  };

  const TS_RULE = 'Incluye marcas de tiempo entre corchetes con el formato [mm:ss] o [h:mm:ss], tomadas de la transcripción.';

  const ACTIONS = [
    {
      id: 'summary', icon: '📝', label: 'Resumen', desc: 'TL;DR + resumen estructurado',
      prompt: `Resume el video.

Usa exactamente esta estructura:
**TL;DR:** una o dos frases con la idea central.

## Resumen
Entre 2 y 5 párrafos que expliquen el contenido de principio a fin.

## Ideas principales
Viñetas con las ideas más importantes. ${TS_RULE}

## Conclusión
La conclusión o mensaje final del video.`,
    },
    {
      id: 'keypoints', icon: '🎯', label: 'Puntos clave', desc: 'Lo esencial en viñetas',
      prompt: `Extrae entre 7 y 15 puntos clave del video, en orden cronológico. Cada punto debe ser una viñeta autocontenida y concreta (datos, cifras, nombres, argumentos). ${TS_RULE}`,
    },
    {
      id: 'chapters', icon: '⏱️', label: 'Capítulos', desc: 'Índice con marcas de tiempo',
      prompt: `Divide el video en capítulos lógicos (entre 4 y 15 según la duración). Para cada capítulo usa una viñeta con el formato:
- [mm:ss] **Título breve** — una frase que describa el contenido.
El primer capítulo debe empezar en [00:00]. Al final agrega un bloque de código con la lista "mm:ss Título" lista para pegar en la descripción de YouTube.`,
    },
    {
      id: 'notes', icon: '📚', label: 'Apuntes', desc: 'Notas de estudio detalladas',
      prompt: `Crea apuntes de estudio completos del video, como si fueran para preparar un examen. Organízalos con títulos (##) y subtítulos (###), viñetas, definiciones en **negrita**, ejemplos y fórmulas o datos relevantes. Termina con una sección "## Glosario" con los términos técnicos y su definición. ${TS_RULE}`,
    },
    {
      id: 'mindmap', icon: '🧠', label: 'Mapa mental', desc: 'Jerarquía de ideas',
      prompt: `Construye un mapa mental del video como una lista anidada de Markdown (tema central → ramas principales → sub-ideas → detalles), con un máximo de 4 niveles y frases muy cortas. Empieza con el tema central en **negrita** como primer elemento.`,
    },
    {
      id: 'quiz', icon: '❓', label: 'Quiz', desc: 'Preguntas para autoevaluarte',
      prompt: `Crea un quiz de 10 preguntas de opción múltiple sobre el video (4 opciones, A-D, una sola correcta), de dificultad progresiva. Numera las preguntas. Al final agrega una sección "## Respuestas" con la letra correcta de cada pregunta, una breve explicación y la marca de tiempo donde se trata [mm:ss].`,
    },
    {
      id: 'flashcards', icon: '🗂️', label: 'Flashcards', desc: 'Tarjetas pregunta/respuesta',
      prompt: `Crea entre 10 y 20 flashcards para memorizar el contenido del video. Formato para cada una:
**P:** pregunta
**R:** respuesta breve

Después, agrega un bloque de código con las mismas tarjetas en formato CSV "pregunta;respuesta" para importar en Anki.`,
    },
    {
      id: 'quotes', icon: '💬', label: 'Citas', desc: 'Frases destacadas textuales',
      prompt: `Extrae entre 5 y 10 de las frases más memorables, impactantes o citables del video, de forma textual (corrigiendo solo errores evidentes de la transcripción automática). Usa citas en bloque (>) y agrega la marca de tiempo [mm:ss] y una línea sobre por qué es relevante.`,
    },
    {
      id: 'steps', icon: '✅', label: 'Pasos y acciones', desc: 'Tutorial paso a paso / tareas',
      prompt: `Si el video es un tutorial o enseña un proceso, conviértelo en una guía paso a paso numerada, con requisitos previos, herramientas o materiales necesarios y advertencias. Si no lo es, extrae las recomendaciones y acciones concretas que el espectador puede aplicar, como una lista de tareas (- [ ]). ${TS_RULE}`,
    },
    {
      id: 'factcheck', icon: '🔍', label: 'Afirmaciones', desc: 'Datos a verificar y sesgos',
      prompt: `Analiza críticamente el video:
## Afirmaciones verificables
Lista las afirmaciones factuales importantes (cifras, estudios, hechos) con su marca de tiempo [mm:ss] e indica, según tu conocimiento, si parecen correctas, dudosas o incorrectas, y por qué. Aclara que es una evaluación preliminar.
## Opiniones presentadas como hechos
## Posibles sesgos o información faltante`,
    },
    {
      id: 'eli5', icon: '🧒', label: 'Explicar fácil', desc: 'Como si tuviera 12 años',
      prompt: 'Explica el contenido del video de forma muy sencilla, como para alguien de 12 años: usa lenguaje cotidiano, analogías y ejemplos. Máximo 400 palabras.',
    },
    {
      id: 'thread', icon: '🧵', label: 'Hilo para X', desc: 'Hilo listo para publicar',
      prompt: 'Escribe un hilo para X/Twitter de 6 a 10 publicaciones que resuma el video de forma atractiva. Numera cada publicación (1/, 2/…), máximo 270 caracteres cada una, la primera con un gancho fuerte y la última con una conclusión. Sin hashtags excesivos.',
    },
    {
      id: 'linkedin', icon: '💼', label: 'Post LinkedIn', desc: 'Publicación profesional',
      prompt: 'Escribe una publicación para LinkedIn (150-250 palabras) basada en el video: gancho inicial, 3-5 aprendizajes en viñetas, una reflexión personal y una pregunta final para generar conversación. Agrega 3 hashtags relevantes.',
    },
    {
      id: 'blog', icon: '✍️', label: 'Artículo de blog', desc: 'Post optimizado para SEO',
      prompt: 'Convierte el video en un artículo de blog bien escrito (800-1200 palabras) con título atractivo (#), introducción, secciones con subtítulos (##), conclusión y una meta-descripción SEO de máximo 155 caracteres al final. No lo escribas como transcripción: redáctalo como un artículo original.',
    },
    {
      id: 'clean', icon: '🧹', label: 'Texto limpio', desc: 'Transcripción con puntuación',
      prompt: 'Reescribe la transcripción como un texto limpio y legible: agrega puntuación y mayúsculas, separa en párrafos, elimina muletillas y repeticiones, y corrige errores evidentes del reconocimiento automático, sin resumir ni cambiar el significado. Coloca la marca de tiempo [mm:ss] al inicio de cada párrafo.',
    },
    {
      id: 'translate', icon: '🌐', label: 'Traducir', desc: 'Traducción completa',
      prompt: 'Traduce la transcripción completa al idioma de respuesta indicado, de forma natural y fiel, agrupada en párrafos. Coloca la marca de tiempo [mm:ss] al inicio de cada párrafo. No resumas.',
    },
  ];

  const CHAT_SUGGESTIONS = [
    '¿De qué trata este video?',
    '¿Cuáles son las conclusiones principales?',
    '¿Qué datos o cifras se mencionan?',
    '¿Hay algo que el video no explique bien?',
  ];

  function languageName(code) {
    return LANGUAGES[code] || code || LANGUAGES.es;
  }

  function buildSystemPrompt({ video, transcriptText, responseLanguage, condensed, chat }) {
    const U = root.SubmeUtils;
    const meta = [
      `Título: ${video?.title || 'desconocido'}`,
      video?.author ? `Canal: ${video.author}` : '',
      video?.lengthSeconds ? `Duración: ${U.formatTime(video.lengthSeconds)}` : '',
      video?.url ? `URL: ${video.url}` : '',
    ].filter(Boolean).join('\n');

    return `Eres Subme Now, un asistente experto en analizar videos de YouTube a partir de su transcripción.

<video>
${meta}
</video>

Reglas:
- Básate en la ${condensed ? 'información de las notas condensadas' : 'transcripción'}; si algo no aparece en el video, dilo con claridad en lugar de inventarlo.
- Responde siempre en ${languageName(responseLanguage)}.
- Usa Markdown bien estructurado.
- Cuando hagas referencia a un momento del video usa marcas de tiempo entre corchetes, por ejemplo [02:15] o [1:02:15]; así el usuario puede hacer clic para saltar a ese momento.
- La transcripción puede venir de subtítulos automáticos con errores de reconocimiento: interprétala con sentido común.
${chat ? '- Estás conversando con el usuario sobre este video: responde de forma directa y concisa a cada pregunta.\n' : ''}
${condensed
    ? `El video es muy largo, así que a continuación tienes notas condensadas y cronológicas de toda la transcripción (con marcas de tiempo):\n<notas>\n${transcriptText}\n</notas>`
    : `Transcripción (cada línea empieza con su marca de tiempo):\n<transcripcion>\n${transcriptText}\n</transcripcion>`}`;
  }

  function buildChunkNotesPrompt(index, total) {
    return `Esta es la parte ${index + 1} de ${total} de la transcripción de un video largo. Toma notas detalladas y cronológicas de esta parte: conserva todos los datos, argumentos, nombres, cifras y ejemplos importantes, y empieza cada nota con su marca de tiempo [mm:ss]. No agregues introducción ni conclusión.`;
  }

  root.SubmePrompts = { LANGUAGES, ACTIONS, CHAT_SUGGESTIONS, languageName, buildSystemPrompt, buildChunkNotesPrompt };
})(globalThis);
