# CBB Espn-Fox 0.0.4 — diseño final

El usuario pidió la arquitectura de CFB FOX adaptada a NCAA masculina, con los equipos de CBB Lloader. Tras aportar los IDs reales `Basq`, confirmó expresamente **Q2 y Q4** como destino de las dos mitades.

## Contrato

- Firefox + Tampermonkey; Rover clásico y adaptador RV2 heredado.
- CATEGORY BASKETBALL / LEAGUE CBB. No activarse en NBA, IBB ni football.
- H1 → Q2, H2 → Q4. Q1 y Q3 vacíos. Suma OT → OT. Total → TOT.
- En descanso y recuperación de H1 durante H2: Q2 y TOT reciben H1; Q1/Q3/Q4/OT se vacían; estado 2. Nunca degradar un evento ya en estado 3.
- Final: las dos mitades, OT y total coinciden en ambas fuentes; estado 3. Marcar Edited=1 cuando cambie algún dato.
- ESPN es primario; FOX debe confirmar identidad, fecha, fase y parciales antes de comenzar a escribir.
- No escribir si falta un control o cambia el evento/contexto durante la consulta. No enviar POST ni pulsar Guardar/Procesar. Los eventos input/change se conservan del CFB original.

## Arquitectura

La fuente mantiene los módulos del CFB original para vistas, filtros, fechas, parseo de filas, HTTP, cachés, búsqueda automática/manual, overrides, UI y observadores. El modelo de marcadores usa `h1`/`h2` semánticos; solo el escritor conoce su correspondencia Q2/Q4. No se inventan cuatro cuartos.

ESPN usa `basketball/mens-college-basketball` y scoreboard `groups=50`; FOX usa `/bifrost/v1/cbk` y URI `basketball/cbk`. Los calendarios usan año de cierre en ESPN e inicio en FOX. Con corte julio, noviembre 2026 y enero–abril 2027 son ESPN 2027 / FOX 2026. Las fechas de eventos se comparan en America/New_York, independientemente de la zona del dispositivo.

287 códigos Rover tienen mapeo ESPN y FOX. Se preservan identidades como LIU Brooklyn → Long Island University/LIU Sharks y se separan Miami FL/OH. Los nombres normalizados solo se usan para identidad exacta y única en el adaptador RV2, sin selección difusa.

Q1/Q3 no participan en el modelo. El período 1 es H1, 2 es H2, 3 es OT, 4 es 2OT. Un marcador ausente sigue ausente; cero sigue siendo un resultado válido. Se compara la suma OT cuando FOX agrega las prórrogas y el desglose cuando ambas fuentes lo ofrecen.

## Evidencia y límites

La distribución e IDs de controles están fundamentados en el DOM aportado por el usuario. Los datos reales Michigan–Duke coinciden en ESPN/FOX: Michigan 33/30/63; Duke 35/33/68. También se capturó un estado en vivo FOX `2ND` para probar la detección de H2.

La validación cubre lógica y DOM en Firefox de Playwright con HTTP sustituido por fixtures. No se ha ejecutado el script dentro de Tampermonkey en el Rover autenticado real; tampoco están disponibles sus handlers internos de input/change.
