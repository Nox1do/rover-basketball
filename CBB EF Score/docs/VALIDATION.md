# Validación 0.0.8

## Ejecución

- `npm run check`: sintaxis correcta.
- `CBB_FIREFOX_CONTAINER=1 node --test tests/*.test.mjs`: 75/75 pruebas, cero fallos: 53 unitarias, 11 Firefox y 11 del publicador.
- Firefox 153.0 de Playwright 1.62.1, headless, usando zona America/Santo_Domingo para ejercitar la independencia de la PC.

Las pruebas iniciales se ejecutaron contra CFB antes de implementar la adaptación. Las regresiones de estado `2ND`, fecha ausente y nombres de estado con underscores se observaron fallar antes de corregirlas.

## Cobertura

Mitades semánticas y Q2/Q4; ceros en Q1/Q3; descanso y recuperación durante H2; final; OT y 2OT detallado/agregado; falta de parciales y ceros; totales inconsistentes; equipos invertidos; fuente retrasada/indisponible/distinta; fecha diferente o ausente; cancelado/pospuesto/suspendido; cambio de liga o editor mientras hay HTTP; destino incompleto; no degradación de Final a H1; inactividad en NBA; calendarios y DST; peticiones GET y cancelación del submit de formulario desde el botón ↻.

## Revisión independiente

Se corrigieron dos hallazgos con pruebas de regresión: fecha ESPN ausente aceptada por el validador, y clasificación errónea de `STATUS_CANCELED/POSTPONED/SUSPENDED` cuando faltaban descripciones. No quedaron bloqueantes de la revisión.

## Límite práctico

Son pruebas de integración con reproducciones del DOM, no una sesión autenticada real de Rover ni una extensión Tampermonkey instalada en Windows. La prueba de formulario descarta el submit nativo accidental del botón en el fixture. No modela handlers internos del sitio que puedan reaccionar a input/change. Las pruebas no modifican resultados reales.

## Ampliación 0.0.2

Los ocho códigos Rover nuevos se verificaron en los APIs oficiales de equipos ESPN y headers FOX. Ocho regresiones comprobaron primero el fallo por código ausente y posteriormente su resolución correcta. Se conservan íntegros los 276 registros originales. El motor de resultados permanece idéntico.

## Ampliación 0.0.3

Revisión de los 22 equipos de la captura de 11 encuentros: añadidos Saint Josephs (277), Wichita State (843) y Auburn (901). Tres pruebas comprueban sus IDs y una prueba adicional confirma cobertura de ambos equipos en los 11 partidos. Los 284 registros anteriores se preservan íntegros.

## Corrección 0.0.4

California Baptist cambia de código Rover 19210 a 984 por indicación del usuario. Conserva ESPN 2856 y FOX 648. La prueba de regresión verifica la resolución con 984 y la retirada del código anterior; el total sigue siendo 287.

## Publicación GitHub 0.0.5

Se conserva el motor de resultados de 0.0.4; solo cambia su VERSION de ejecución. Se añaden rutas estables de actualización Tampermonkey, distribuciones JS/TXT, metadata, versiones históricas y un publicador que sincroniza VERSION, package, lockfile, encabezado y mapa embebido. El workflow de GitHub ejecuta integridad y pruebas en Node 22 y Firefox.

La revisión del publicador detectó y corrigió tres casos: rutas con espacios en Firefox, metadata vacía que podía consumir la línea siguiente y lockfiles incompatibles que podían consumir una versión antes de fallar. Las regresiones se comprobaron fallar antes de la corrección y el conjunto final pasa 75/75. El publicador rechaza versiones repetidas, snapshots existentes y notas ausentes antes de escribir.

## Ceros en Q1/Q3 — 0.0.6

Por indicación del usuario, Q1 y Q3 reciben 0 en ambos equipos, tanto al final como en descanso y recuperación de H1. Se observaron fallar los dos casos unitarios con la versión anterior antes de cambiar el llenado. Firefox comprueba el valor de los cuatro controles en CLASSIC y RV2, y en las consultas H1/H2.

## Ampliación 0.0.7

La lista del usuario contiene 46 encuentros y 92 equipos distintos: 68 ya incluidos y 24 nuevos. Se verificaron 48 respuestas oficiales, una ESPN y una FOX CBK por equipo nuevo, comprobando ID y nombre. El mapa JSON y CSV queda en 311 registros, sin alterar ninguno de los 287 anteriores. La publicación regenera el mapa embebido; el código de resultados permanece idéntico a 0.0.6 salvo VERSION.

## Ampliación 0.0.8

Segunda lista: 118 equipos NCAA en 59 encuentros, 94 existentes y 24 nuevos. Se verificaron 48 respuestas oficiales de equipos ESPN y headers FOX CBK, comprobando ID y nombre. Se conservan los 311 registros anteriores. El mapa JSON, CSV y embebido queda en 335 equipos; el motor de resultados permanece idéntico a 0.0.7 salvo VERSION. Los cuatro encuentros internacionales quedan fuera del mapa NCAA.
