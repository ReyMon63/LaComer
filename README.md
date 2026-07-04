# Preciador GE — La Comer

App web (sin backend) para que el vendedor cotice al instante cuánto cobrar por una Garantía Extendida, con SKU y código de barras listos para caja.

## Archivos

| Archivo | Para qué sirve | ¿Cuándo lo tocas? |
|---|---|---|
| `index.html` | Estructura de la pantalla | Casi nunca |
| `style.css` | Diseño visual | Si quieres cambiar colores/estilo |
| `app.js` | Lógica (login, búsqueda, cálculo, QR/código de barras) | Solo si cambia el comportamiento |
| `data.js` | **Catálogo y claves de acceso** | **Cada vez que cambien porcentajes, SKUs, artículos o claves** |

La idea es que casi todas las correcciones futuras (nuevo % de GE, nuevo SKU, nuevo artículo elegible, nueva clave de vendedor) solo requieran editar `data.js`, sin tocar nada más.

## Cómo publicarlo en GitHub Pages

1. Crea un repositorio en GitHub (puede ser privado o público) y sube estos 4 archivos a la raíz.
2. Ve a **Settings → Pages**, selecciona la rama `main` y carpeta `/root`, y guarda.
3. GitHub te da una URL tipo `https://tuusuario.github.io/tu-repo/`. Esa es la URL real de la app.
4. Abre esa URL, entra con la clave, toca el ícono ⛶ ("Compartir") en la esquina superior y ahí se genera el QR real que apunta a esa URL — solo tienes que enseñar ese QR (o imprimirlo) para que cualquier vendedor lo escanee y entre directo a la app desde su celular.

No hace falta que yo genere el QR de antemano: en cuanto la app esté publicada, ella misma genera su propio QR con la URL donde vive.

## Clave de acceso (prueba 1)

Por ahora la única clave válida es `reymon`, hardcodeada en `data.js`:

```js
const ACCESS_CODES = ["reymon"];
```

Cuando me compartas la tabla real de claves (por vendedor, por ejemplo), la cambiamos por un arreglo/objeto con esa tabla — es un cambio contenido solo en `data.js`.

## Cómo funciona el cálculo

- Todas las Garantías Extendidas se cobran como **precio de venta del artículo × porcentaje**, sin redondeo (se muestra el monto exacto con centavos), tal como está en el Excel origen.
- **Instalación** es un monto fijo de $990 (no es %) y solo se ofrece como casilla adicional cuando el artículo buscado aparece en la lista de artículos elegibles para instalación (línea blanca específica y pantallas), igual que en la hoja original.
- El buscador es dinámico: filtra conforme escribes, sin distinguir mayúsculas/acentos, contra la columna "Artículos Elegibles" de cada subcategoría. Si no hay coincidencia, avisa que probablemente no es elegible.
- Cuando hay opciones de 1/2/3 años, se muestran todas a la vez ordenadas de mayor a menor duración, con la de mayor duración marcada como "Recomendada" y preseleccionada; basta un toque para cambiar a otra.
- El SKU se muestra como **código de barras (Code128)**, formato que sí leen los lectores láser/CCD de caja (a diferencia de un QR, que la mayoría de cajas no lee).
- Si el precio del artículo supera **$15,000**, la app no calcula nada: muestra "Artículo NO Elegible" y aclara que el valor máximo permitido es $15,000. Este tope está en `app.js` como `MAX_PRECIO` por si más adelante cambia.

## Próximas mejoras posibles

- Tabla real de claves por vendedor (con nombre, para saber quién cotizó qué).
- Conectar `data.js` a tu Google Sheet en vivo (via fetch a un JSON publicado), en vez de tenerlo hardcodeado, para que actualices precios sin tocar código.
- Historial de las últimas cotizaciones de la sesión, por si el vendedor necesita repetir una.
- Botón "copiar resultado" para pegarlo en WhatsApp o en notas internas.
