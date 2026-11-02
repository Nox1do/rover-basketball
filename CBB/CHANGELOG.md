# Historial de cambios — CBB LLoader

## [Unreleased]

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
