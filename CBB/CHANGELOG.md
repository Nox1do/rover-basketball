# Historial de cambios — CBB LLoader

## [Unreleased]

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
