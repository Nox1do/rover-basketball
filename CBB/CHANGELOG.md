# Historial de cambios — CBB LLoader

## [Unreleased]

## [0.1.22] - 2026-11-13

- Tres nuevas equivalencias Rover↔ESPN (936→253, 698→2458, 865→2046).
- Añadidos 62 cruces, total 360 equipos y 470 cruces de referencia.
- Pruebas de regresión para los nuevos códigos y partidas; reglas de enlace intactas.


## [0.1.21] - 2026-11-12

- Se añade West Florida con el código Rover vigente 275 y ESPN 2697, manteniendo descartado el código anterior 10641.
- El total de equipos de CBB LLoader aumenta a 357; no se altera el CSV de partidos ni la vinculación.
- Nuevas pruebas de mapeo y rechazo del código obsoleto.


## [0.1.20] - 2026-11-10

- Se incorporan cinco equipos Rover↔ESPN y se corrige California Baptist al código Rover 984 (antes 19210).
- Añadidas 48 referencias; total 356 equipos y 408 cruces.
- Pruebas actualizadas para el código corregido y los nuevos cruces; sin cambios de lógica de vinculación.


## [0.1.19] - 2026-11-09

- Se añaden 11 equivalencias Rover↔ESPN para la nueva lista de 57 enfrentamientos, totalizando 351 equipos y 360 cruces de referencia.
- Se corrigen las regresiones históricas para usar rangos fijos en el CSV en lugar de tomar los últimos N encuentros.
- Se añaden pruebas del nuevo lote de 57 encuentros. La lógica de vinculación y auditoría permanece intacta.


## [0.1.18] - 2026-11-09

- Incorporados cinco códigos Rover↔ESPN: South Carolina State, UNC Greensboro, UIC, Alabama A&M y Mississippi Valley State.
- Añadidos 33 enfrentamientos de referencia, totalizando 340 equipos y 303 cruces históricos.
- Pruebas de regresión para la cobertura de los nuevos equipos. Sin cambios en la lógica de validación de fecha, hora o localía.


## [0.1.17] - 2026-11-07

- Incorporadas seis identidades Rover↔ESPN faltantes: Boise State, Drake, Norfolk State, William & Mary, CSU Bakersfield y UT Arlington.
- Añadidos 29 emparejamientos de referencia. Total: 335 equipos y 270 encuentros.
- Pruebas de regresión para nuevas identidades y 29 cruces. Sin cambios en la lógica de hora, localía y corrección segura de enlaces.


## [0.1.16] - 2026-11-06

- Añadidos los mapeos 982→292 (UT Rio Grande Valley), 834→71 (Bradley) y 134→28 (UC San Diego).
- Corregida la identidad Rover 970: Fresno State→ESPN 278, anteriormente atribuida a UC San Diego.
- Incorporados 48 emparejamientos de referencia; 329 equipos y 241 encuentros registrados.
- Pruebas de regresión para los códigos corregidos y los 48 cruces; sin cambios en las salvaguardas de enlace.


## [0.1.15] - 2026-11-06

- Añadidas 20 equivalencias Rover↔ESPN solicitadas tras errores `AWAY/HOME sin equivalencia ESPN`, elevando el catálogo a 326 equipos.
- Se conservan los 193 emparejamientos de referencia anteriores y el mecanismo de comparación segura.
- Colorado–San Diego State permanece en `LOCALÍA INVERTIDA`; no se altera ni fuerza la coincidencia.
- Nuevas pruebas de los 20 códigos y regresión de las identidades de Colorado y San Diego State.


## [0.1.14] - 2026-11-04

- Se añaden 19 identificadores Rover↔ESPN para los partidos del 5 de noviembre de 2026 (306 equipos en total).
- Se añaden 43 emparejamientos de referencia, para un total de 193.
- Se amplían pruebas del mapa y emparejamientos. La lógica de verificación de fechas, horas, localía y guardado permanece intacta.


## [0.1.13] - 2026-11-03

- Auditoría de enlaces: explica cada estado `NEEDS_REVIEW` usando el motivo concreto que ya calcula el motor de análisis.
- Para eventos invertidos compara visitante/local de Rover con visitante/local de ESPN. Para horas diferentes indica ambas horas.
- Muestra `gameId` candidatos cuando hay referencia ESPN, distingue URL actual coincidente con candidato de URL que apunta a otro `gameId`, sin afirmar que un candidato sea una coincidencia exacta.
- Añade los campos de solo lectura `matchupStatus`, `reviewReason`, `candidateIds`, `matchesCandidate` a `getLinkAudit()`.
- Sin cambios en la elegibilidad ni lógica del botón `Corregir incorrectos`, ni en la apertura/guardado de modales.
- Pruebas de Grambling–Northern Illinois, localía y hora diferentes, enlaces no coincidentes y ausencia de candidatos ESPN.


## [0.1.12] - 2026-11-03

- Ampliada auditoría ESPN a `boxscore`, `matchup`, `playbyplay` y `game?gameId=` además de `game/_/gameId=`.
- Reconoce URLs de partidos ESPN de otras competiciones con un `gameId` válido como `WRONG_COMPETITION` y permite corrección solo con partido NCAA masculino exacto y auditoría completa.
- Separa `OTHER_ESPN_FORMAT` de `OTHER_LINK` para no confundir enlaces oficiales no reconocidos con proveedores externos.
- Añade dominio y ruta sanitizados a la auditoría visual; API `getUnrecognizedLinks()` agrupa entradas desconocidas sin publicar parámetros ni fragmentos de URL.
- Conserva una sola escritura, la comprobación de URL antigua y la confirmación posterior; nunca corrige proveedores externos ni enlaces ESPN sin partido verificable.
- Pruebas de falsos positivos, rutas alternativas, dominios suplantados, tokens omitidos y reemplazo de otras competiciones.


## [0.1.11] - 2026-11-03

- Detecta el enlace de ESPN NCAA femenino como `WRONG_COMPETITION` en lugar de `OTHER_LINK`, incluidos enlaces localizados de `espndeportes.espn.com`.
- `Verificar enlaces` identifica gameId y competición del link existente sin editar; el panel presenta los errores de competición separadamente.
- `Corregir incorrectos` incluye enlaces femeninos únicamente si hay un juego masculino ESPN exacto y verificado; conserva los bloqueos de coincidencias invertidas, diferencias de horario y proveedores ajenos.
- Protecciones al corregir: relectura del enlace original, coincidencia estricta de competición e ID, un guardado, reapertura y comprobación, notificación con deporte original y destino.
- Pruebas de integración del caso `401920019`, host internacional, URL maliciosa, ausencia de coincidencia y cambios concurrentes del enlace.


## [0.1.10] - 2026-11-03

- Se incorporan 11 enfrentamientos y sus 11 nuevos equipos Rover verificados con el catálogo NCAA CBB de ESPN.
- Mapeo incrementado de 276 a 287 códigos, sin cambiar los existentes; enfrentamientos aumentados de 139 a 150.
- Casos diferenciados: SIU Edwardsville (791→2565), Cal State Northridge (737→2463), Southeastern Louisiana (922→2545), South Dakota (772→233) y North Dakota State (932→2449).
- Nueva suite de regresión para los 11 pares, identidades existentes y partidos invertidos. No se modifica el procesamiento ni guardado de los enlaces.


## [0.1.9] - 2026-11-02

- Sincronización del editor con las estructuras confirmadas en Firefox: `#ge-ee-serial`, `#ge-ee-team1`, `#ge-ee-team2` y `#ge-ee-url`.
- Bloquea escritura sobre modales visibles pero incompletos, con SN equivocado o equipos diferentes.
- Evita falsos errores cuando Rover guarda el enlace sin mostrar una notificación: confirma persistencia reabriendo el evento tras una sola escritura.
- La recarga de la tabla es informativa; la confirmación depende del `gameId` persistido.
- Ignora toasts de éxito de eventos anteriores para evitar cierres prematuros.
- Pruebas de montaje tardío, tres guardados consecutivos, ausencia de confirmación y ausencia real de persistencia; 51 regresiones automatizadas.


## [0.1.8] - 2026-11-02

- Diagnóstico de 11 campos `EVENT RESULTS URL` ausentes y un fallo de confirmación de guardado.
- Detección de URL por selector fijo, atributos y etiquetas de formularios; espera acotada a controles asíncronos.
- Metadatos de control en errores para diagnóstico sin imprimir valores de campos.
- Reconoce mensajes explícitos nuevos de guardado con modal abierto, pero exige reabrir y verificar el enlace persistido.
- Nuevas pruebas de etiquetas, campos ambiguos y confirmación del guardado.


## [0.1.7] - 2026-11-02

- Corregida detención prematura tras primer guardado causada por validación estricta de todo el conjunto de filas.
- Validación por evento de SN, fecha, hora, visitante y local; se permiten filas nuevas y filtradas por Rover.
- Filas ausentes o cambiadas se omiten sin escribir y el lote continúa.
- Eliminado corte automático de dos errores consecutivos; continúa el bloqueo ante cambio de liga/fecha o editor inseguro.
- Resumen de guardados, existentes, omitidos, errores y pendientes. Nuevas pruebas de tres eventos con DOM dinámico.


## [0.1.6] - 2026-11-02

- Corregido el fallo que enlazaba un evento y omitía el resto tras recargar la tabla.
- Recuperación de filas por `tkt`, igual que el parser; compatible con reconstrucciones de `tbody` y tabla completa.
- Guardado marcado `SAVED` solo después de reabrir el editor y verificar la URL persistida.
- Validación segura por evento de equipos, hora y fecha, permitiendo desaparecer solamente filas ya guardadas.
- Detiene errores repetidos con diagnóstico explícito para no recorrer la cola sin procesar.


## [0.1.5] - 2026-11-02

- Añadidos 20 emparejamientos NCAA CBB y 38 nuevos códigos de equipo Rover; 276 equipos totales y 139 enfrentamientos documentados.
- Mapeos verificados contra el catálogo y las fichas de equipos ESPN, incluidos California Baptist (`19210→2856`), Sam Houston State (`923→2534`) y San Diego State (`848→21`).
- Preservados Stetson (`662→56`) y Lipscomb (`658→288`) sin duplicar entradas.
- Pruebas de integridad de los 20 encuentros y de código Rover de cinco dígitos; funcionalidades de carga/auditoría sin cambios.


## [0.1.4] - 2026-11-02

- Corregida versión visual v0.1.0 tras actualizar: la UI antigua se reutilizaba porque todas las versiones compartían su ID de panel.
- IDs de panel, launcher y CSS únicos a partir de esta versión; etiqueta de versión sincronizada en cada sondeo.
- Detecta panel heredado, lo oculta y advierte sobre instalaciones duplicadas en Tampermonkey.
- Bloquea escritura de enlaces mientras una versión antigua siga activa para prevenir controles simultáneos.
- Diagnóstico `uiDiagnostics()` y pruebas de versión visible, compatibilidad y bloqueo seguro.


## [0.1.3] - 2026-11-02

- Nuevo botón **Verificar enlaces** para auditar URLs existentes sin escribir.
- Nuevo botón **Corregir incorrectos**: solo cambia links ESPN CBB con `gameId` equivocado cuando el partido esperado está confirmado `READY`.
- Protege los enlaces correctos, de otros proveedores y los eventos con horarios distintos, localías invertidas o sin coincidencia.
- Revalida el enlace original antes de editar; después del guardado reabre para comprobar persistencia y notifica SN e IDs corregidos mediante `GM_notification`.
- Nuevas APIs de diagnóstico `verifyLinks()`, `correctLinks()` y `getLinkAudit()`; scoreboard ESPN actualizado antes de cada auditoría.


## [0.1.2] - 2026-11-02

- Corregida la alternancia de Cargar enlaces/Probar 1 en Firefox: el sondeo de 1 segundo deja de recalcular `disabled` tras completar Analizar.
- Se mantiene la validación estricta de contexto justo antes de cada escritura; si la tabla o liga cambia, la carga se cancela.
- Añadido control de instancia única para evitar paneles/intervalos competidores desde v0.1.2 en adelante. Las versiones anteriores (0.1.0 y 0.1.1) deben desactivarse manualmente si están duplicadas.
- Aplicados los dos `@match` aprobados para `index.php` y restringido `@include` a esa página para evitar inyecciones en otras pantallas.
- Pruebas de regresión de estabilidad del botón, guardia de liga, instancias duplicadas y metadatos.

## [0.1.1] - 2026-11-02

- Se corrige el nombre a **CBB LLoader**, cuya función es exclusivamente enlazar ESPN, comprobar horarios e identificar localías invertidas.
- Nuevo archivo instalable estable `Rs-ESPN-CBB-LLoader.user.js`; actualización compatible con la ruta de la v0.1.0.
- Publicador y pruebas del proyecto adaptados. Motor de comparación y escritura de enlaces sin cambios.

## [0.1.0] - 2026-11-02

- Adaptación del CFB LLoader 0.1.6 adjunto: conservadas las 58 funciones originales, adaptadas a baloncesto universitario masculino.
- 238 IDs Rover ↔ ESPN para 119 encuentros iniciales, incluidos Queens, Southern Indiana y Lindenwood.
- Scoreboard NCAA masculino (groups=50 + fallback default) y calendario por equipo (season=2027 para noviembre 2026).
- Emparejamiento estricto por identificadores, orden visitante/local, fecha y hora America/New_York.
- Análisis, lista de revisión, Probar 1, Cargar enlaces, Detener y panel; sin sustitución de URLs preexistentes.
- Protección frente a cambio de tabla/fecha entre análisis y carga y separación de NBA/CFB.
- Suite de regresión automatizada con escenarios de datos ESPN y DOM simulado; sin escritura real a Rover durante las pruebas.
