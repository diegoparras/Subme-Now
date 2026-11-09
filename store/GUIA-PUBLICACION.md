# Guía para publicar Subme Now en la Chrome Web Store

Tiempo estimado: 30–45 minutos + revisión de Google (normalmente de 1 a 7 días).

## 0. Antes de empezar

1. **Une esta rama a `main`** para que la política de privacidad quede en
   `https://github.com/diegoparras/Subme-Now/blob/main/PRIVACY.md`.
2. **Genera el paquete:**
   ```bash
   npm run build
   ```
   Crea `dist/subme-now-1.3.0.zip` (solo `manifest.json`, `_locales`, `icons` y `src`).
3. **Prueba el paquete**: descomprímelo en una carpeta nueva y cárgalo en `chrome://extensions` → *Cargar descomprimida*. Revisa un video normal, un Short y una acción de IA.

## 1. Cuenta de desarrollador

1. Entra a https://chrome.google.com/webstore/devconsole con tu cuenta de Google.
2. Acepta el acuerdo y paga la **cuota única de 5 USD**.
3. En **Account** completa el nombre del editor (aparece públicamente) y **verifica un email de contacto**: sin eso no te deja publicar.

## 2. Subir el paquete

**Items → New item →** sube `dist/subme-now-1.3.0.zip`.

## 3. Pestaña "Store listing"

Copia los textos de `store/FICHA-TIENDA.md`:

- Descripción (español), categoría **Tools**, idioma **Español**.
- Ícono de la tienda: `icons/icon128.png`.
- Capturas: `store/screenshots/1-transcripcion.png` … `5-shorts.png`.
- Mosaico promocional pequeño: `store/promo-small-440x280.png`. La marquesina `store/marquee-1400x560.png` es opcional.
- Homepage URL: `https://github.com/diegoparras/Subme-Now`
- Support URL: `https://github.com/diegoparras/Subme-Now/issues`
- Agrega **inglés** como segundo idioma con los textos en inglés de la ficha.

## 4. Pestaña "Privacy practices"

**Single purpose (propósito único):**
```
Mostrar la transcripción de los videos de YouTube junto al reproductor y permitir al usuario procesarla (resumir, crear capítulos, responder preguntas, etc.) con el proveedor de IA que él mismo configura.
```

**Justificación de permisos:**

| Permiso | Justificación (copiar) |
|---|---|
| `storage` | Guarda localmente la configuración del usuario (proveedor de IA, modelo, idioma, acciones personalizadas) y sus API keys. Nada se sincroniza ni se envía a servidores del desarrollador. |
| Host `https://www.youtube.com/*` (content script) | Inserta el panel de Subme Now en las páginas de videos y Shorts de YouTube y obtiene la transcripción del video que el usuario está viendo. |
| Hosts `openrouter.ai`, `api.openai.com`, `api.x.ai`, `api.anthropic.com`, `generativelanguage.googleapis.com` | Envía, solo cuando el usuario lo pide, la transcripción y su pregunta al proveedor de IA que configuró con su propia API key, y lista los modelos disponibles en su cuenta. |
| Hosts opcionales `https://*/*`, `http://*/*` | Solo se solicitan en tiempo de ejecución, con aprobación explícita, cuando el usuario configura un proveedor personalizado compatible con OpenAI (por ejemplo, Ollama local o Groq). El permiso se pide exclusivamente para el dominio que el usuario escribió. |

**¿Usa código remoto?** → **No**. Todo el JavaScript está incluido en el paquete.

**Uso de datos.** Marca:
- ☑ **Authentication information**: las API keys que el usuario ingresa, que solo se envían al proveedor de IA elegido.
- ☑ **Website content**: la transcripción, el título y la URL del video, que se envían al proveedor de IA elegido cuando el usuario usa una función de IA.
- Todo lo demás: sin marcar.

Y marca las tres certificaciones:
- ☑ No vendo ni transfiero datos de usuarios a terceros, fuera de los casos de uso aprobados.
- ☑ No uso ni transfiero datos de usuarios para fines no relacionados con el propósito único del ítem.
- ☑ No uso ni transfiero datos de usuarios para determinar solvencia crediticia ni para préstamos.

**URL de la política de privacidad:**
```
https://github.com/diegoparras/Subme-Now/blob/main/PRIVACY.md
```

## 5. Pestaña "Distribution"

- Visibilidad: **Public**, o **Unlisted** si primero quieres probarla con un enlace.
- Regiones: todas.
- Precio: gratis.

## 6. Enviar a revisión

Pulsa **Submit for review**. Puntos que suelen revisar con atención, y por qué esta extensión los cumple:

- **Permisos amplios opcionales** (`https://*/*`): están justificados por el proveedor personalizado y solo se piden en ese momento. Si el revisor los objeta, la alternativa es quitar el proveedor personalizado y la entrada `optional_host_permissions` del manifest.
- **Marca "YouTube" en el nombre**: se usa de forma descriptiva ("para YouTube"), el ícono no imita el logo de YouTube y la descripción aclara que no hay afiliación.
- **Sin código remoto ni ofuscación**: el código se sube tal cual, legible.

## 7. Actualizaciones futuras

1. Sube el `version` en `manifest.json` (por ejemplo, 1.1.1).
2. Ejecuta `npm run build`.
3. En el dashboard: tu ítem → **Package → Upload new package** → **Submit for review**.

## Regenerar las imágenes

```bash
npm run store-assets
```

Usa la interfaz real de la extensión con contenido de ejemplo y requiere Playwright con Chromium.
