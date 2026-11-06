# CBB LLoader — NCAA Men's Basketball

Versión estable **0.1.16** (primera versión 0.1.0) basada en el archivo aportado `userscript - cfb lloader-0.1.6.user.js`.

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

## Verificar y corregir enlaces (v0.1.3)

**Verificar enlaces** abre los editores uno a uno en modo solo lectura y compara los links existentes con los eventos ESPN verificados. Al terminar, **Corregir incorrectos** reemplaza exclusivamente enlaces ESPN CBB que apuntan al partido equivocado, siempre que Rover y ESPN coincidan exactamente en equipos, orden local/visitante, fecha y hora. No sustituye proveedores externos ni coincidencias inciertas. Antes de guardar revalida el link anterior; tras guardar reabre el editor y comprueba el nuevo link. Solo después envía una notificación de Tampermonkey. Usar `__CBB_LLOADER.getLinkAudit()` para diagnosticar.

La auditoría de los 119 juegos puede tardar; permite **Detener**. Se recomienda validar en un enlace incorrecto de prueba antes de una corrección masiva.

## Compatibilidad con paneles de versiones anteriores (v0.1.4)

Las versiones 0.1.0 a 0.1.3 usaban el ID `cbb-lloader-panel`, por lo que el nuevo script podía reutilizar el panel de 0.1.0 con el título antiguo y botones sin actualizar. La v0.1.4 utiliza un ID de panel independiente (`cbb-lloader-panel-v2`) y sincroniza la versión visible en cada comprobación de UI.

Si se detecta otra instalación activa del script, se oculta su panel antiguo, se muestra un aviso en el panel nuevo y se bloquean **Cargar enlaces** y **Corregir incorrectos** hasta que desactives la copia antigua en Tampermonkey y recargues Rover. Análisis y verificación de solo lectura siguen disponibles. Diagnóstico: `__CBB_LLOADER.uiDiagnostics()`.

## Ampliación de equipos (v0.1.5)

Incorporados 20 enfrentamientos adicionales y 38 equipos nuevos de la NCAA. El mapeo pasa de **238 a 276 IDs Rover↔ESPN** y la lista de enfrentamientos de **119 a 139**. Se conserva la correspondencia original de Stetson (`662→56`) y Lipscomb (`658→288`). Identificadores verificados: California Baptist (`19210→2856`), Sam Houston (`923→2534`), San Diego State (`848→21`), Fullerton (`736→2239`) y New Orleans (`788→2443`). Ninguna regla de comparación, edición ni notificación se altera en esta versión.

## Continuidad tras guardar (v0.1.6)

Para evitar omitir la cola tras el primer guardado: se recupera cada fila nueva por `tkt`, se admiten reconstrucciones completas o parciales del DOM y se reabre cada editor para confirmar la persistencia del enlace. El sistema permite que Rover filtre filas ya guardadas, pero rechaza cambios de equipos, liga, fecha y hora de eventos pendientes. Si dos operaciones seguidas fallan, detiene la carga en lugar de saltarse todo lo restante. Diagnóstico: `__CBB_LLOADER.getLog()` y `__CBB_LLOADER.getPlan()`.

## Continuación tras cambios de filas en Rover (v0.1.7)

La carga valida individualmente SN, equipos, fecha y hora del evento actual, y protege la liga/fecha seleccionada. Ya no detiene el procesamiento cuando Rover agrega, filtra o reordena otras filas después de guardar. Las filas ausentes o cambiadas quedan como `SKIPPED` sin escribir y permite continuar. Los errores por evento se reportan sin un corte arbitrario de dos errores; la carga se interrumpe si cambia la liga/fecha o queda un editor inseguro. El resumen incluye guardados, ya vinculados, omitidos, errores y pendientes.

## Editor URL dinámico (v0.1.8)

Detecta EVENT RESULTS URL por identificador, metadatos o etiqueta accesible asociada; espera hasta 4,5 segundos por controles de carga tardía. Si no hay campo inequívoco, no escribe y registra SN con metadatos de los controles sin revelar sus valores. Si Rover informa éxito y deja abierto el editor, lo cierra, pero solo se declara SAVED después de volver a abrir y verificar la URL persistida. Diagnóstico de solo lectura: `__CBB_LLOADER.diagnoseModal()` mientras el editor esté abierto.

## Editor sincronizado con el DOM real de Firefox (v0.1.9)

Un modal visible no equivale a un formulario listo. CBB LLoader espera ahora que `#ge-ee-serial` identifique el SN esperado, que `#ge-ee-team1` y `#ge-ee-team2` coincidan con visitante y local, y que `#ge-ee-url` esté montado antes de leer o escribir. Estas cuatro referencias fueron comprobadas en el editor real de Rover. No necesita que la etiqueta visual `EVENT RESULTS URL` tenga atributo `for`.

Tras hacer clic una sola vez en Guardar Cambios, el script espera cierre o confirmación de Rover. Si no aparece mensaje, cierra de forma controlada y reabre el SN para verificar la URL almacenada; no se confía solo en un toast ni se repite el guardado automáticamente. La falta de recarga de la tabla deja de ser un error por sí misma. Se ignoran las notificaciones de éxito que ya estaban visibles antes del guardado. Sigue siendo recomendable comenzar con **Probar 1** y verificar el SN en Rover antes de cargar todos los enlaces.

## Equipos y partidos añadidos el 3 de noviembre de 2026 (v0.1.10)

Se incorporan 11 equipos nuevos y 11 partidos nuevos (SN 1200199, 1200411, 1200412, 1200413, 1200414, 1200447, 1200448, 1200478, 1200491, 1200492 y 1200493), sin sustituir los 11 equipos que ya figuraban en el mapeo. Total: **287 equipos Rover↔ESPN** y **150 enfrentamientos**. Las equivalencias separan expresamente North Dakota State (932→2449) de North Dakota (155), California (877→25) de California Baptist (19210→2856), y Southeastern Louisiana (922→2545) de Southeast Missouri State (ESPN 2546). No se han cambiado las funciones de apertura del editor, fecha, hora, localía ni verificación de enlaces.

## Detección ESPN de otra competición (v0.1.11)

El auditor reconoce enlaces de la NCAA **femenina** (`womens-college-basketball`) en `www.espn.com` y `espndeportes.espn.com`, incluido `https://espndeportes.espn.com/womens-college-basketball/game/_/gameId/401920019`. Los clasifica como `WRONG_COMPETITION`, no `OTHER_LINK`, y enseña el ID antiguo y el ID masculino esperado. **Corregir incorrectos** se habilita únicamente si la auditoría termina, el evento tiene estado `READY` y una coincidencia masculina exacta por equipos, visitante/local, fecha y hora. Se verifica que el enlace anterior no haya cambiado, se realiza un único guardado y se reabre el editor para comprobar la persistencia. Enlaces externos, partidos invertidos y sin coincidencia exacta continúan protegidos. La notificación de reemplazo distingue ESPN femenino y masculino.

## Auditoría extendida de enlaces ESPN (v0.1.12)

El auditor distingue `WRONG_COMPETITION` (página de juego ESPN de otra competición con ID verificable), `OTHER_ESPN_FORMAT` (dominio oficial ESPN, pero formato de enlace no interpretado), y `OTHER_LINK` (proveedor externo o URL desconocida). Reconoce `game`, `boxscore`, `matchup`, `playbyplay` con `/_/gameId/` y la ruta directa `game?gameId=`, tanto de `www.espn.com` como de `espndeportes.espn.com`. Los enlaces a partidos válidos del mismo `gameId` y NCAA masculina no aparecen falsamente como incorrectos. Una competición diferente solo puede corregirse si los equipos, visitante/local, fecha y hora coinciden exactamente; la URL antigua se relee, se guarda una vez y se reabre para confirmar. Enlaces externos y formatos desconocidos no son autocorregibles.

Para identificar formatos restantes sin exponer tokens, tras **Verificar enlaces**, ejecutar en la consola de Firefox `console.table(__CBB_LLOADER.getUnrecognizedLinks())`. Muestra SN, categoría, dominio/ruta sin query y ESPN esperado.

## Explicaciones de NEEDS_REVIEW (v0.1.14)

En **Verificar enlaces**, cada `NEEDS_REVIEW` ahora incluye el motivo concreto calculado por el motor de análisis (localía invertida, hora diferente, ambas, falta de hora, múltiples coincidencias, equipo sin equivalencia ESPN o partido no encontrado). Cuando hay candidatos ESPN, muestra sus `gameId`, el orden de local/visitante en casos invertidos y si la URL actual coincide con un candidato. **La coincidencia con un candidato no valida automáticamente el partido**; las diferencias de localía y horario siguen impidiendo reemplazos automáticos.

Para consultar los diagnósticos sin modificar enlaces: `console.table(__CBB_LLOADER.getLinkAudit().filter(r => r.status === 'NEEDS_REVIEW'))`. Campos adicionales: `matchupStatus`, `reviewReason`, `candidateIds`, `matchesCandidate`. El ejemplo Grambling @ Northern Illinois con ESPN `401920912` se explica como localía invertida, aun con horas iguales.

## Encuentros del 5 de noviembre de 2026 — 0.1.14

Se incorporan 19 códigos Rover con equivalencias ESPN para cubrir 43 emparejamientos proporcionados por el usuario. El mapeo pasa a 306 equipos y el archivo de referencia a 193 encuentros. El listado no incluye horarios ni gameId: el loader los verifica por fecha, minuto y localía antes de escribir enlaces.

## Incorporaciones v0.1.15 — 6 noviembre 2026

Se incorporan 20 códigos Rover ↔ ESPN faltantes reportados por `NEEDS_REVIEW`, aumentando la cobertura de 306 a **326 equipos**. Se preservan los 193 emparejamientos de referencia previos, los horarios y la escritura segura. No se agregan emparejamientos sin disponer de ambos códigos Rover.

**Colorado @ San Diego State (SN 1204502)** no es un caso de equivalencias faltantes: ambos equipos están identificados (Colorado `724→38`, SDSU `848→21`); el diagnóstico `LOCALÍA INVERTIDA` requiere revisión de cuál equipo figura como local en cada fuente. No se intercambia localía ni se enlaza automáticamente.

Los rivales Bradley, Fresno State y UT Rio Grande Valley no se añadieron porque en la lista recibida no se proporcionaron sus códigos Rover.

## Reconciliación v0.1.16 — 6 de noviembre de 2026

Para los 48 enfrentamientos facilitados, se añaden **982 UT Rio Grande Valley → ESPN 292**, **834 Bradley → ESPN 71** y **134 UC San Diego → ESPN 28**. Se corrige **970 Fresno State → ESPN 278**, incorrectamente atribuido a UC San Diego en v0.1.15. Total **329 equipos** y **241 emparejamientos de referencia**. Los 48 nuevos cruces no tienen fecha ni hora asignadas, porque no fueron proporcionadas. Siguen vigentes los controles estrictos de fecha, hora y localía.
