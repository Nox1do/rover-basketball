# CBB LLoader — NCAA Men's Basketball

Versión estable **0.1.2** (primera versión 0.1.0) basada en el archivo aportado `userscript - cfb lloader-0.1.6.user.js`.

Este script **vincula enlaces de partidos de ESPN con la tabla de eventos de Rover**. No llena puntajes ni resultados del juego. **Exclusivamente vincula partidos ESPN, compara la hora y verifica si los equipos están invertidos.** Las 58 funciones del CFB LLoader fueron transferidas y adaptadas; se añadieron cuatro funciones auxiliares para CBB.

## Instalación (Firefox + Tampermonkey)

Instala `dist/Rs-ESPN-CBB-LLoader.user.js` desde la URL **Raw**. Las actualizaciones se detectan por la misma ruta estable con `@updateURL` y `@downloadURL`, siempre que se incremente `@version`.

Se conserva la ruta de actualización de la v0.1.0 (`dist/Rs-ESPN-CBB-Resultados.user.js`) como alias compatible para Firefox/Tampermonkey. Si se solicita, confirma el cambio de URL.

## Uso

1. Abre la tabla de eventos Rover con CATEGORY `BASKETBALL` y LEAGUE `CBB` (o la cabecera CBB en la tabla agrupada).
2. Verifica que la tabla esté en la fecha correcta y pulsa **Search** si cambiaste fecha o liga.
3. Pulsa **Analizar**. Cada encuentro se coteja con el API de ESPN por IDs de equipos, visitante/local, fecha y hora.
4. Revisa los encuentros que no sean READY: no se cargarán por defecto.
5. Usa **Probar 1** con un evento y revisa el URL persistido en Rover antes de usar **Cargar enlaces**.
6. **Detener** interrumpe después de terminar el evento actual.

`window.__CBB_LLOADER` expone `analyze()`, `load({limit:1})`, `stop()`, `getPlan()`, `getSummary()`, `getLog()`, `getRoverEvents()`, `isCBBView()`, `clearCache()`, `qa` para diagnósticos.

## Estructura y control de versiones

- `src/`: fuente editable (no editar copias publicadas).
- `dist/`: ruta estable de instalación y actualización.
- `versions/`: copia histórica inmutable `Rs-ESPN-CBB-LLoader-vX.Y.Z.user.js`.
- `data/`: cruce Rover ↔ ESPN y partidos de la ronda inicial.
- `tests/`: validaciones de mapeo, resolución, DST, ligas y seguridad.
- `VERSION` / `CHANGELOG.md`: versión y cambios.
- `scripts/release.mjs`: publicador ya configurado (incrementar versión y tener sección en CHANGELOG antes de usar).

## Consideraciones y pruebas pendientes

- La hora se interpreta en `America/New_York`, no en la zona horaria del equipo; el CFB original usaba `America/Santo_Domingo`.
- Para la temporada 2026-27, ESPN usa `season=2027`.
- Solo se actualiza el campo EVENT RESULTS URL para colocar el enlace ESPN, no resultados. Si ya existe un enlace de cualquier proveedor, se conserva y marca error, excepto cuando coincide el mismo evento ESPN.
- No se afirma compatibilidad completa con cambios futuros del DOM de Rover sin inspección con sesión autenticada. Requiere prueba manual en Firefox de apertura, guardado y recarga en `#tablaEventos` / `#ge-ee-form-wrap`.
- El comparador exige exactitud de minuto, orden visitante/local y fecha; horarios distintos quedan para revisión.
- No ejecutar a la vez otros loaders de CBB que puedan modificar los mismos campos.

Fuentes de endpoints: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&limit=1000&dates=AAAAMMDD` y `/teams/{teamId}/schedule?season=2027`.

## Nota de compatibilidad Firefox (v0.1.2)

En Tampermonkey, **deja habilitado un solo CBB LLoader**. Los nombres de la v0.1.0 y v0.1.1 cambiaron y pueden aparecer como dos usuarioscripts diferentes que manipulan el mismo panel. La v0.1.2 protege inyecciones duplicadas de esta versión y futuras, pero no puede desactivar automáticamente scripts anteriores que carecen de la protección.

Cuando el análisis está listo, el latido de la interfaz (cada segundo) ya no cambia el estado del botón. Antes de cualquier guardado, `loadLinks()` vuelve a comprobar la liga, fecha, equipos y horario de la tabla. Solo se ejecuta en `https://www.roversport.lol/adm/es/index.php` o `https://www.roversport.net/adm/es/index.php` (con parámetros de consulta opcionales).
