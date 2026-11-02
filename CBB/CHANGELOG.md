# Historial de cambios — CBB LLoader

## [Unreleased]

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
