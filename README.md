# Subme Now

Extensión de Chrome que se integra en YouTube para **extraer los subtítulos de cualquier video** y procesarlos con IA usando **tu propia API key** de **OpenRouter, OpenAI, Grok (xAI), Anthropic (Claude), Google Gemini** o cualquier API compatible con OpenAI (Ollama, LM Studio, Groq, DeepSeek…).

Sin servidores intermedios: la transcripción sale directo de YouTube y las consultas van directo de tu navegador al proveedor que elijas.

---

## Funcionalidades

### 📜 Transcripción (gratis, sin API key)
- Panel integrado a la derecha del video (respeta el modo claro/oscuro de YouTube).
- **YouTube Shorts**: panel flotante con transcripción, IA y chat (se puede contraer).
- Selector de idioma de subtítulos y **traducción automática de YouTube** a cualquier idioma.
- **Clic en cualquier línea para saltar** a ese momento del video.
- **Seguimiento en vivo**: resalta la línea que se está reproduciendo y hace scroll automático.
- **Búsqueda** dentro de la transcripción con resaltado.
- Mostrar u ocultar las marcas de tiempo.
- **Copiar** y **descargar** como TXT (con o sin tiempos), **SRT**, **VTT**, **Markdown** o **JSON**.

### ✨ Acciones de IA (con tu API key)
| Acción | Qué hace |
|---|---|
| 📝 Resumen | TL;DR, resumen, ideas principales con tiempos y conclusión |
| 🎯 Puntos clave | 7–15 puntos concretos en orden cronológico |
| ⏱️ Capítulos | Índice con marcas de tiempo + bloque listo para pegar en la descripción de YouTube |
| 📚 Apuntes | Notas de estudio con títulos, definiciones y glosario |
| 🧠 Mapa mental | Jerarquía de ideas en lista anidada |
| ❓ Quiz | 10 preguntas de opción múltiple con respuestas explicadas |
| 🗂️ Flashcards | Tarjetas pregunta/respuesta + CSV para importar en **Anki** |
| 💬 Citas | Frases textuales más memorables con su momento |
| ✅ Pasos y acciones | Tutorial paso a paso o lista de tareas accionables |
| 🔍 Afirmaciones | Datos verificables, opiniones presentadas como hechos y posibles sesgos |
| 🧒 Explicar fácil | Explicación sencilla con analogías |
| 🧵 Hilo para X | Hilo de 6–10 publicaciones |
| 💼 Post LinkedIn | Publicación profesional con hashtags |
| ✍️ Artículo de blog | Artículo SEO con meta-descripción |
| 🧹 Texto limpio | Transcripción con puntuación, en párrafos y sin muletillas |
| 🌐 Traducir | Traducción completa al idioma elegido |

Además:
- **💬 Chat con el video**: haz preguntas y la IA responde usando la transcripción.
- **Prompt libre**: escribe cualquier pedido sobre el video.
- **Acciones personalizadas**: crea tus propios botones con tu prompt desde la configuración.
- **Cambio rápido de proveedor, modelo e idioma de respuesta desde el propio panel**, con la lista de modelos de tu cuenta y los usados recientemente.
- Las respuestas se muestran **en streaming**, en Markdown, y **las marcas de tiempo son clicables** (saltan al momento del video).
- Copiar o descargar cada resultado como `.md`, regenerar o detener.
- Idioma de respuesta configurable (español, inglés, portugués, francés, alemán, italiano o el del video).
- **Videos muy largos**: si la transcripción supera el límite configurado, se condensa por partes automáticamente (map → reduce), útil para modelos con contexto chico.
- Resumen automático opcional al abrir cada video.

---

## Instalación (modo desarrollador)

1. Descarga o clona este repositorio:
   ```bash
   git clone https://github.com/diegoparras/subme-now.git
   ```
2. Abre `chrome://extensions` en Chrome, Edge, Brave u otro navegador basado en Chromium.
3. Activa **Modo de desarrollador** (arriba a la derecha).
4. Haz clic en **Cargar descomprimida** y selecciona la carpeta `subme-now`.
5. Se abre la página de configuración: elige un proveedor, pega tu API key y pulsa **Probar conexión**.
6. Abre cualquier video de YouTube: el panel **Subme Now** aparece a la derecha.

> Para actualizar después de un `git pull`, pulsa el botón ↻ de la extensión en `chrome://extensions` y recarga YouTube.

### ¿Dónde consigo una API key?

| Proveedor | Enlace | Modelo por defecto |
|---|---|---|
| OpenRouter | https://openrouter.ai/keys | `openrouter/auto` |
| OpenAI | https://platform.openai.com/api-keys | `gpt-5-mini` |
| Grok (xAI) | https://console.x.ai | `grok-4` |
| Anthropic | https://console.anthropic.com/settings/keys | `claude-opus-5-5` |
| Google Gemini | https://aistudio.google.com/apikey | `gemini-2.5-flash` |
| Personalizado | URL base compatible con OpenAI (p. ej. `http://localhost:11434/v1` para Ollama) | el que indiques |

En cada proveedor puedes escribir otro modelo o pulsar **Cargar modelos** para elegir de la lista real de tu cuenta.

> **Tip:** OpenRouter da acceso a casi todos los modelos (Claude, GPT, Gemini, Llama, DeepSeek, Qwen…) con una sola clave, incluidos algunos gratuitos.

---

## Cómo funciona

```
YouTube (página)                         Service worker                  Proveedor de IA
┌─────────────────────────┐   puerto     ┌──────────────────┐   HTTPS    ┌───────────────┐
│ content scripts          │ ──────────▶ │ background.js     │ ─────────▶ │ OpenRouter /   │
│  · transcript.js         │ ◀────────── │  · adaptadores    │ ◀───SSE─── │ OpenAI / xAI / │
│  · panel.js (Shadow DOM) │  deltas     │    providers.js   │            │ Anthropic /    │
└─────────────────────────┘              └──────────────────┘            │ Gemini         │
                                                                          └───────────────┘
```

**Obtención de subtítulos** (`src/content/transcript.js`), en este orden:
1. API interna de YouTube `youtubei/v1/get_transcript` (la misma del botón "Mostrar transcripción"), que también entrega la lista de idiomas.
2. Pistas de subtítulos `timedtext` en formato `json3` (permite traducción automática).
3. Las mismas pistas con el token de verificación (`pot`) que usa el reproductor, capturado al activar un instante los subtítulos.
4. Como último recurso, abre el panel de transcripción nativo de YouTube, lo lee y lo vuelve a cerrar.

**IA** (`src/shared/providers.js` + `src/background.js`): las llamadas se hacen desde el service worker con streaming SSE. Cada proveedor tiene su adaptador (OpenAI-compatible, Anthropic Messages API, Gemini `streamGenerateContent`).

### Estructura

```
manifest.json
icons/
src/
  background.js           # service worker: llamadas a las APIs, streaming, listado de modelos
  shared/
    providers.js          # adaptadores de OpenRouter, OpenAI, Grok, Anthropic, Gemini y personalizado
    prompts.js            # acciones de IA y system prompt
    markdown.js           # renderizador Markdown seguro (con marcas de tiempo clicables)
    settings.js           # configuración en chrome.storage.local
    utils.js              # formatos de exportación (TXT, SRT, VTT, MD), tiempos, etc.
  content/
    transcript.js         # extracción de subtítulos
    ai.js                 # cliente de streaming y condensado de videos largos
    panel.js              # interfaz del panel
    styles.js             # estilos (Shadow DOM)
    main.js               # detección de navegación SPA de YouTube
  options/                # página de configuración
_locales/                 # nombre y descripción en español e inglés
tests/e2e.mjs             # prueba end-to-end con Playwright (YouTube y API simulados)
scripts/build.sh          # genera el .zip para la Chrome Web Store
scripts/store-assets.mjs  # genera capturas e imágenes promocionales
store/                    # textos de la ficha, imágenes y guía de publicación
PRIVACY.md                # política de privacidad
```

### Pruebas

```bash
npm test
```

Carga la extensión en Chromium, simula una página de YouTube y una API compatible con OpenAI, y verifica: carga de transcripción, cambio de idioma, búsqueda, salto en el video, descarga SRT, resumen con IA en streaming, marcas de tiempo clicables, cambio de modelo desde el panel, chat, Shorts, navegación SPA y que las API keys no sean accesibles desde YouTube. Requiere Playwright con Chromium instalado.

### Publicar en la Chrome Web Store

```bash
npm run build
```

Genera `dist/subme-now-<versión>.zip`. Los textos de la ficha están en [`store/FICHA-TIENDA.md`](store/FICHA-TIENDA.md), las imágenes en `store/` y el paso a paso (permisos, privacidad, distribución) en [`store/GUIA-PUBLICACION.md`](store/GUIA-PUBLICACION.md).

---

## Privacidad

- No hay servidores propios ni analíticas.
- Las API keys se guardan en `chrome.storage.local` (no se sincronizan con tu cuenta de Google) con acceso restringido a la propia extensión: el código que corre dentro de YouTube no puede leerlas, y las llamadas a la IA se hacen desde el service worker.
- Política completa: [PRIVACY.md](PRIVACY.md).
- Solo se envía la transcripción al proveedor de IA cuando haces clic en una acción o en el chat (o si activas el resumen automático).
- Permisos: `storage` y acceso a los dominios de las APIs de IA. Para un proveedor personalizado se pide permiso solo para su dominio.

## Ideas para próximas versiones

- Soporte para videos embebidos en otros sitios.
- Exportar resultados a Notion, Google Docs u Obsidian.
- Historial de resúmenes guardados por video.
- Comparar o resumir varios videos (por ejemplo, una playlist completa).
- Atajos de teclado (p. ej. `Alt+S` para resumir).
- Lectura en voz alta del resumen (Text-to-Speech).

## Licencia

MIT
