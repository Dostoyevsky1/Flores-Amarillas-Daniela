# Flores amarillas para Daniela

Una página adaptable a celular y computadora con un ramo original, una carta editable y tres pequeños espacios para dibujos.

## Personalizar

1. Pulsa **Personalizar** o **Escribir mi carta**.
2. Toca los párrafos, el saludo y la firma para escribir tus propias palabras. El texto inicial es solo un ejemplo.
3. Toca cada espacio para dibujar con el dedo o el mouse. También puedes elegir una imagen PNG, JPG o WebP (hasta 8 MB).
4. **Mover espacios** cambia su distribución sin borrar los dibujos.
5. **Guardar carta** conserva el borrador en ese navegador y dispositivo. No modifica el contenido publicado ni sincroniza otros dispositivos.
6. **Descargar para Daniela** crea un archivo HTML con el texto y dibujos actuales, sin controles de edición. Las imágenes y el diseño están incluidos. Puedes enviárselo o publicarlo como una página estática. Las fuentes de Google necesitan conexión; sin conexión se utilizan las fuentes de respaldo.

## Archivos

- `dist/index.html`: página y texto inicial.
- `dist/styles.css`: diseño adaptable.
- `dist/app.js`: edición, dibujos, guardado local y descarga.
- `dist/assets/ramo-amarillo.png`: ilustración original.
- `server.mjs`: vista previa local; ejecutar `node server.mjs` y abrir la dirección que muestra.

Para descargar un regalo desde el editor, abre la página a través de la vista previa o del sitio publicado. El editor necesita HTTP para incluir sus recursos en la descarga. El archivo final descargado sí puede abrirse directamente.

No se necesitan dependencias ni compilación. No hay servidor de datos, cuentas propias, formularios de envío ni rastreadores. El borrador usa almacenamiento local. Evita compartir el enlace del editor suponiendo que incluye tus cambios: para compartir tu versión personalizada usa la descarga.

## Referencia y arte

Referencia proporcionada: https://www.tiktok.com/@detalliape/video/7684902895657045255

El ramo se generó una vez con la herramienta integrada `image_gen`; no se usó una API externa ni el modo CLI. Está guardado en `dist/assets/ramo-amarillo.png`.

Prompt utilizado:

> Use case: stylized-concept. Asset type: original botanical illustration for the right side of a romantic Spanish-language website welcoming spring for Daniela. Primary request: A lovingly hand-painted bouquet of yellow spring flowers: exactly 3 small sunflowers, golden cosmos, delicate tiny daisy blossoms, and light olive-green stems and leaves. Tie the stems with a thin golden-yellow ribbon. Scene/backdrop: Flat warm ivory #faf8ed, extending to every edge and blending seamlessly into a website with that background color. Style/medium: Fine watercolor and colored-pencil botanical illustration, sophisticated natural organic composition, slightly whimsical handmade romantic stationery. Delicate paper grain and very subtle watercolor texture, concentrated in the botanical artwork. Composition/framing: Portrait 4:5 composition. Bouquet alone, centered and occupying most of the frame with airy margins. Flowers in the upper two thirds, ribbon lower. All stems, leaves, ribbon, and petals fully inside the frame. Color palette: Vivid golden-yellow petals, light olive foliage, thin golden-yellow ribbon, flat warm ivory #faf8ed background. Mood: Tender, fresh, springlike, artful, intimate. Constraints: No text, lettering, logos, watermark, page, UI, vase, or additional objects. Not cartoon. No heavy outlines. No background scene, gradients, border, cast shadow, or vignette. The whole bouquet must be visible.
