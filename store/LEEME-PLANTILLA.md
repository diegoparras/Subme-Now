# Subme Now {VERSION}: qué poner en cada campo de la Chrome Web Store

Las carpetas siguen el menú de la izquierda del Developer Dashboard. Cada texto está en su propio archivo `.txt`: ábrelo, copia todo y pégalo en el campo.

## Si ya enviaste una versión anterior
1. **Paquete → Subir un paquete nuevo** (`1-Paquete/{PAQUETE}`).
2. **Ficha → Descripción**: reemplázala por `2-Ficha/textos/descripcion-es.txt` (y la inglesa por `descripcion-en.txt`) si la versión agrega funciones.
3. **Ficha → Capturas**: reemplaza las 5 si cambiaron (en `opcional/` hay más, por si prefieres otras: chat, Shorts, búsqueda y repaso).
4. **Privacidad**: si la versión agrega permisos, completa su justificación (en la 1.6: `sidePanel`).
5. **Acceso → Instrucciones de la prueba**: reemplázalas por `5-Instrucciones-de-la-prueba/instrucciones-de-la-prueba.txt`.
6. **Enviar a revisión**.

---

## 1. Paquete
Sube `1-Paquete/{PAQUETE}` **sin descomprimir**. El título (**Subme Now: AI YT Transcript Platform**) y el resumen vienen dentro del paquete.

## 2. Ficha de Play Store
| Campo | Qué poner |
|---|---|
| Descripción | `2-Ficha/textos/descripcion-es.txt` |
| Categoría | `2-Ficha/textos/categoria.txt` → **Herramientas** |
| Icono de Chrome Web Store | `2-Ficha/graficos/icono-tienda-128x128.png` |
| Capturas de pantalla localizadas | Las 5 de `2-Ficha/graficos/capturas-de-pantalla/`, en orden 1 → 5 |
| Capturas de pantalla globales | Las mismas 5 |
| Mosaico promocional pequeño (440×280) | `2-Ficha/graficos/mosaicos-promocionales/mosaico-pequeno-440x280.png` |
| Mosaico con desplazamiento (1400×560) | `2-Ficha/graficos/mosaicos-promocionales/mosaico-con-desplazamiento-1400x560.png` |
| Vídeo promocional | Vacío |
| URL oficial / página principal / asistencia / contenido para adultos | `2-Ficha/textos/campos-adicionales.txt` |

**Ficha en inglés:** en "Idioma de edición actual" agrega **inglés – en** y pega `descripcion-en.txt`, con las mismas 5 capturas.

No subas `opcional/10-configuracion.png`: muestra nombres de proveedores y la tienda ya rechazó una vez por exceso de marcas. `iconos-de-la-extension/` es solo de referencia, porque ya van dentro del paquete.

## 3. Privacidad
| Campo | Archivo |
|---|---|
| Descripción de la finalidad única | `3-Privacidad/1-finalidad-unica.txt` |
| Justificación de storage | `3-Privacidad/2-justificacion-storage.txt` |
| Justificación de sidePanel | `3-Privacidad/2-justificacion-sidepanel.txt` |
| Justificación de Permiso de host | `3-Privacidad/3-justificacion-permiso-de-host.txt` |
| ¿Utilizas código remoto? | **No** (`4-codigo-remoto.txt`) |
| Uso de datos y certificaciones | `3-Privacidad/5-uso-de-datos.txt` |
| URL de la Política de Privacidad | `3-Privacidad/6-url-politica-de-privacidad.txt` |

## 4. Distribución
`4-Distribucion/distribucion.txt`: gratis, público, todas las regiones.

## 5. Acceso → Instrucciones de la prueba
Pega `5-Instrucciones-de-la-prueba/instrucciones-de-la-prueba.txt`.

**Opcional y recomendado:** crea en openrouter.ai una clave **solo para la revisión, con límite de 1 USD**, agrégala al final ("Clave de prueba: …") y bórrala cuando la aprueben.

## 6. Enviar
Pulsa **Enviar a revisión**. Si el botón está gris, **"¿Por qué no puedo enviar?"** te dice qué falta.

---

**Regla:** no pongas nombres de marcas, proveedores ni productos en el título, el resumen, la descripción ni las imágenes.
