# Mi biblioteca

Estantería personal de libros como aplicación web progresiva (PWA). Los libros se muestran como lomos en una balda; al pulsar uno, el libro sale en 3D y se abre su ficha de lectura con valoración, frase favorita y notas.

**Demo:** https://luciaparvaz.github.io/mi-biblioteca/

Es un único `index.html` con HTML, CSS y JavaScript sin frameworks ni paso de compilación. Funciona sin conexión, se puede instalar en el móvil o el ordenador y no necesita servidor, cuentas ni claves de API.

---

## Descripción

- **Tres niveles de lectura:** estantería de lomos → portada en 3D → ficha lateral con los datos del libro.
- **Datos en el navegador:** la biblioteca se guarda en `localStorage`. El botón **Guardar en archivo** reescribe la lista de libros dentro del propio `index.html` (en Chrome y Edge sobrescribe el archivo elegido; en el resto descarga una copia actualizada).
- **Empieza con un libro de ejemplo** (*Don Quijote de la Mancha*). Tu propia biblioteca se añade con **+** o se carga con **Importar biblioteca** a partir de un `.json` exportado.
- **Formulario ágil:** solo son obligatorios el título y el autor/a. El resto es opcional: ISBN, país del autor/a, estado, fecha, género, valoración de 1 a 5, páginas, color del lomo, portada, frase favorita y notas.

## Características clave

### Estados de lectura
Selector de un clic con **Leído**, **Leyendo** y **Pendiente**. Sin marcar, el libro simplemente está «en tu biblioteca». Los libros que estás leyendo llevan un marcapáginas en el lomo y la cabecera muestra el recuento por estado.

### Escáner de ISBN
- Botón **Escanear ISBN** con visor de cámara (cámara trasera) y guía visual.
- Usa la API nativa `BarcodeDetector` cuando el navegador la ofrece; si no, carga bajo demanda [html5-qrcode](https://github.com/mebjas/html5-qrcode) 2.3.8 desde cdnjs, con comprobación de integridad (SRI).
- Lee códigos EAN-13 y acepta solo ISBN válidos (978/979 con dígito de control). También permite escribir el ISBN (admite ISBN-10) o leerlo desde una foto.
- La cámara requiere HTTPS (por ejemplo, GitHub Pages) o `localhost`.

### Ediciones y portadas
- Con el ISBN rellena título, autor/a y páginas, solo en los campos vacíos, y muestra una cuadrícula con las portadas de las distintas ediciones (editorial · año · idioma). La edición del ISBN aparece marcada como «Tu ISBN».
- Fuentes: Open Library (edición por ISBN y resto de ediciones de la obra) y Google Books (por ISBN y por título y autor/a).
- También se puede subir una foto de la portada (se reduce a unos 420 px de ancho) o pegar una URL. El color del lomo puede tomarse de la portada.
- **Buscar portadas que faltan** completa en bloque las portadas vacías.

### Premios literarios
- Detección automática en segundo plano a partir de:
  - **Wikidata:** premios recibidos (P166) y candidaturas (P1411) de la obra, más el Nobel de Literatura o el Premio Cervantes del autor/a.
  - **Google Books y Open Library:** análisis del texto de la descripción, las categorías y las materias.
- Reconoce, entre otros, Nobel, Pulitzer, Cervantes, Planeta, Booker, Goncourt, Nacional, Princesa de Asturias, Nadal, Herralde, Rómulo Gallegos, Strega, National Book Award y Hugo, y distingue a los finalistas.
- El premio aparece como sello dorado en la portada 3D, como punto en el lomo y como etiqueta en la ficha. Un premio mal detectado se puede quitar y no vuelve a añadirse.

### Pasaporte literario
- País de origen del autor/a obtenido de Wikidata: país actual de su lugar de nacimiento o, si no consta, su nacionalidad. Primero se busca a través de la obra y, si no aparece, por el nombre, solo cuando no hay ambigüedad. También se puede escribir a mano.
- Vista de «sellos de viaje» con el código del país y el número de libros. Al pulsar un sello, la estantería se filtra a los libros de ese país.

### Tarjeta literaria
- Postal de 1080×1350 px dibujada directamente en Canvas, sin librerías: portada con sombra, título, autor/a, valoración en estrellas, sello del premio y frase favorita.
- **Descargar PNG** y, en móviles compatibles, **Compartir** mediante la Web Share API.
- Si la web de la portada no permite copiarla (CORS), se usa la portada de diseño generada por la app.

### El libro misterioso
Elige al azar uno de los libros **Pendientes** con una animación de barajado sobre la estantería y abre su ficha 3D. Respeta la preferencia de sistema «reducir movimiento».

### Exportar e importar
- **Exportar biblioteca:** descarga un `.json` limpio con todos los libros, notas, valoraciones, estados, premios y países.
- **Importar biblioteca:** acepta el `.json` exportado o una lista suelta de libros, y muestra un resumen antes de confirmar.
  - **Fusionar:** añade los libros nuevos. Los existentes se conservan y solo se completan sus campos vacíos; las notas distintas se añaden. Los duplicados se detectan por título y autor/a normalizados, o por `id` con el mismo autor/a.
  - **Reemplazar:** descarga antes una copia de la biblioteca actual.
- Los datos importados se sanean (URLs de portada, colores, fechas, valoraciones) y antes de importar se guarda una copia en `localStorage`.

### Cuenta y sincronización en la nube (Supabase)
- Botón **Cuenta** en la cabecera para crear una cuenta con email y contraseña, iniciar sesión y cerrar sesión. Un punto de color indica el estado: sincronizado, pendiente o error.
- **Sin sesión**, la app funciona igual que siempre en modo invitado con `localStorage`.
- **Offline-first:** cada cambio se guarda primero en el dispositivo y se sube en segundo plano. Sin conexión, los cambios esperan y se envían al recuperarla, al volver a la app o con **Sincronizar ahora**.
- **Al iniciar sesión** en un dispositivo nuevo se descarga la biblioteca de la cuenta y se integra con lo que hubiera en modo invitado. El libro de ejemplo sin modificar no se sube.
- **Tiempo real:** los cambios hechos en otro dispositivo llegan al instante (Supabase Realtime).
- **Conflictos:** si el mismo libro cambia en dos sitios, gana la versión más reciente. Los borrados se propagan a todos los dispositivos.
- **Dispositivo compartido:** si en él había libros de otra cuenta, no se mezclan. **Cerrar sesión y borrar de este dispositivo** elimina la copia local, pero no la de la nube.

**Configuración** (una sola vez):
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En *SQL Editor*, ejecuta [`supabase/schema.sql`](supabase/schema.sql). Crea la tabla `libros` con seguridad por filas (cada usuario solo ve sus libros) y la activa para tiempo real.
3. En *Authentication → URL Configuration*, añade la URL de la app (p. ej. `https://luciaparvaz.github.io/mi-biblioteca/`) como *Site URL* / *Redirect URL*, para que funcione el enlace del email de confirmación.
4. En *Project Settings → API*, copia la **Project URL** y la clave pública (**publishable**, o la *anon* de «Legacy API keys») en la constante `SUPABASE` de `index.html`.

La clave *anon* es pública por diseño; la protección la dan las políticas RLS del esquema. **Nunca pongas la clave `service_role` en la app.** Mientras `SUPABASE` tenga los valores de ejemplo, el botón Cuenta solo informa de que la sincronización no está configurada.

### Texto
Corrector ortográfico (`spellcheck`, idioma español) en la frase favorita y las notas, y un botón **Limpiar formato** que quita los espacios dobles y los espacios antes de la puntuación, pone mayúsculas al inicio de frase, convierte las comillas a «» y `...` a «…». Se puede deshacer con Ctrl+Z.

## Instalación PWA

**Desde la web publicada** (https://luciaparvaz.github.io/mi-biblioteca/):

- **Android (Chrome):** menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*.
- **iPhone / iPad (Safari):** botón Compartir → *Añadir a pantalla de inicio*.
- **Ordenador (Chrome / Edge):** icono de instalar en la barra de direcciones.

La app instalada se abre en ventana propia e incluye el atajo **Añadir libro**, que abre directamente el formulario.

**En local**, el service worker y la cámara necesitan `http://localhost` o HTTPS (no funcionan abriendo el archivo con doble clic):

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

**Funcionamiento sin conexión** (`service-worker.js`):

| Recurso | Estrategia |
|---|---|
| Página (`index.html`) | Red primero, con la copia guardada si no hay conexión |
| Manifest e iconos | Guardados al instalar (caché primero) |
| Google Fonts | Respuesta desde caché y actualización en segundo plano |
| Portadas | Caché primero, máximo 200 imágenes |
| html5-qrcode (cdnjs) y supabase-js (jsDelivr) | Respuesta desde caché y actualización en segundo plano |
| Google Books, Open Library, Wikidata | Siempre en red (búsquedas, nunca en caché) |
| Supabase (cuenta, datos, tiempo real) | Siempre en red: la caché no distingue usuarios ni sesiones; el modo sin conexión lo da `localStorage` |

Al cambiar archivos de la app hay que subir la constante `VERSION` de `service-worker.js` (actualmente `v12`) para que las instalaciones descarguen la nueva versión.

## Estructura del proyecto

```
.
├── index.html                 # App completa: estructura, estilos, lógica y lista inicial de libros
├── manifest.json              # Manifest de la PWA (rutas relativas ./)
├── service-worker.js          # Caché sin conexión y estrategias por tipo de recurso
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png  # Icono adaptable (Android)
│   └── apple-touch-icon.png   # Icono para iOS
├── supabase/
│   └── schema.sql             # Tabla «libros», políticas RLS y tiempo real (opcional)
├── .github/workflows/
│   └── static.yml             # Despliegue automático en GitHub Pages desde main
└── README.md
```

## Tecnologías utilizadas

- **HTML, CSS y JavaScript sin frameworks**, en un solo archivo y sin dependencias de compilación.
- **APIs del navegador:** Service Worker y Cache API, Web App Manifest, `localStorage`, Canvas 2D, File System Access API (`showSaveFilePicker`), Web Share API, `getUserMedia` y `BarcodeDetector`, CSS 3D transforms.
- **html5-qrcode 2.3.8:** lector de códigos de barras, solo en navegadores sin `BarcodeDetector`.
- **Supabase (supabase-js 2.117.2):** autenticación por email, base de datos Postgres con RLS y Realtime. Opcional; se carga solo si está configurado.
- **Fuentes:** Cormorant Garamond e Inter (Google Fonts).
- **Datos abiertos y gratuitos, sin claves:** Google Books API, Open Library API y Wikidata (SPARQL).
- **GitHub Actions + GitHub Pages** para el despliegue.

## Limitaciones conocidas

- Sin cuenta, los libros se guardan en el navegador de cada dispositivo. Para pasarlos a otro, usa **Exportar** / **Importar** o inicia sesión con Supabase configurado.
- La sincronización usa la hora de cada dispositivo para decidir qué versión es más reciente; si un reloj va muy desfasado, puede ganar la versión equivocada.
- Google Books sin clave usa una cuota diaria compartida entre todos sus usuarios; cuando se agota, las búsquedas siguen funcionando con Open Library y Wikidata.
- La detección de premios y países depende de lo que esté registrado en Wikidata.
