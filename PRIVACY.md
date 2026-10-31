# Política de privacidad de Subme Now

_Última actualización: 31 de octubre de 2026_

Subme Now es una extensión de navegador que muestra la transcripción de los videos de YouTube y permite procesarla con un servicio de inteligencia artificial elegido por el usuario. Esta política explica qué datos maneja y cómo.

## Resumen

- **No tenemos servidores.** Subme Now no envía ningún dato a sus desarrolladores.
- **No hay analíticas, rastreo ni publicidad.**
- Las API keys que ingresas **se guardan solo en tu navegador** y se envían únicamente al proveedor de IA que elegiste.
- La transcripción de un video se envía al proveedor de IA **solo cuando lo pides** (al pulsar una acción o enviar un mensaje en el chat), o automáticamente si activas la opción "Generar el resumen automáticamente".

## Datos que maneja la extensión

| Dato | Para qué se usa | Dónde se guarda / a quién se envía |
|---|---|---|
| API keys de proveedores de IA | Autenticarte ante el proveedor que elegiste | `chrome.storage.local` de tu navegador (no se sincroniza). Solo se envía al proveedor correspondiente por HTTPS. Las páginas web, incluida YouTube, no pueden leerlas. |
| Contraseña de protección (opcional) | Cifrar tus API keys | **No se guarda.** Se usa solo para derivar la clave de cifrado (PBKDF2-SHA256, 600.000 iteraciones); en disco queda únicamente el texto cifrado (AES-GCM 256). Las claves descifradas viven en memoria (`chrome.storage.session`) hasta que cierras el navegador o se bloquean por inactividad. |
| Preferencias (proveedor, modelo, idioma, acciones personalizadas) | Recordar tu configuración | `chrome.storage.local` de tu navegador |
| Transcripción, título, canal y URL del video | Generar resúmenes, respuestas del chat y demás acciones | Se obtiene de YouTube y se envía al proveedor de IA elegido solo cuando usas una función de IA. No se almacena de forma permanente. |
| Preguntas que escribes en el chat o en el prompt libre | Responderte | Se envían al proveedor de IA elegido. No se almacenan de forma permanente. |

Subme Now **no** recopila tu historial de navegación, datos personales, ubicación, contraseñas de sitios web, datos financieros ni de salud.

## Proveedores de IA

Cuando usas una función de IA, los datos indicados arriba se envían directamente desde tu navegador al proveedor que configuraste. Ese proveedor los trata según su propia política de privacidad:

- OpenRouter: https://openrouter.ai/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- xAI (Grok): https://x.ai/legal/privacy-policy
- Anthropic (Claude): https://www.anthropic.com/legal/privacy
- Google (Gemini): https://policies.google.com/privacy
- Proveedor personalizado: el servidor que tú indiques.

## Permisos

- **storage**: guardar tu configuración y tus API keys localmente.
- **Acceso a youtube.com**: mostrar el panel junto al video y leer la transcripción.
- **Acceso a los dominios de las APIs de IA** (openrouter.ai, api.openai.com, api.x.ai, api.anthropic.com, generativelanguage.googleapis.com): enviar las solicitudes que pidas.
- **Acceso opcional a otros dominios**: solo se solicita, con tu aprobación explícita, si configuras un proveedor personalizado, y se limita a ese dominio.

## Uso limitado

El uso de la información que recibe Subme Now cumple la [Política de Datos de Usuario de la Chrome Web Store](https://developer.chrome.com/docs/webstore/program-policies/limited-use), incluidos los requisitos de uso limitado. Los datos no se venden, no se transfieren a terceros (salvo al proveedor de IA que elegiste para prestar la función) y no se usan para publicidad, para evaluar solvencia crediticia ni para ningún fin ajeno a la funcionalidad de la extensión.

## Cómo borrar tus datos

En la configuración de Subme Now pulsa **Restablecer configuración**, o desinstala la extensión: todos los datos locales se eliminan.

## Contacto

Para consultas sobre privacidad abre un issue en https://github.com/diegoparras/Subme-Now/issues.

---

# Privacy Policy (English)

Subme Now has no servers and collects no analytics. API keys are stored only in your browser (`chrome.storage.local`, not synced, not readable by web pages) and are sent only to the AI provider you selected. Video transcripts, titles and your chat questions are sent to that provider only when you use an AI feature (or automatically if you enable auto-summary). Data is never sold, never used for advertising or creditworthiness, and never transferred to anyone other than your chosen AI provider. Uninstalling the extension or using "Reset settings" deletes all local data. The use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Contact: https://github.com/diegoparras/Subme-Now/issues
