# CBB Loader (NCAA Men's Basketball)

Módulo independiente de `rover-basketball`, basado conceptualmente en el loader CFB de `football-rover` y orientado a resultados de baloncesto universitario masculino desde ESPN.

**Estado: infraestructura de versiones preparada; el userscript CBB todavía no se ha implementado ni publicado.** `VERSION=0.0.0` significa que no existe una versión instalable.

## Estructura

- `src/` — fuente editable (`Rs-ESPN-CBB-Resultados.user.js` cuando exista).
- `dist/` — archivo **estable** para instalar y recibir actualizaciones de Tampermonkey (`Rs-ESPN-CBB-Resultados.user.js`), generado al publicar la primera versión funcional.
- `versions/` — copias históricas inmutables (`Rs-ESPN-CBB-Resultados-vX.Y.Z.user.js`).
- `scripts/release.mjs` — genera la versión estable y el archivo histórico, valida metadatos y aumenta `VERSION`.
- `tests/` — pruebas del publicador; se ampliarán con pruebas del loader.
- `data/` — mapeos Rover ↔ ESPN (se incorporarán con la implementación).
- `CHANGELOG.md` — registro de cada versión.
- `VERSION` — última versión publicada.

## Versionado

Se usa `MAJOR.MINOR.PATCH` (por ejemplo, `0.1.0`, `0.1.1`, `0.2.0`).

- `PATCH`: correcciones que conservan la compatibilidad.
- `MINOR`: nuevas funcionalidades compatibles.
- `MAJOR`: cambios incompatibles o ruptura de flujos existentes.

Para la primera publicación funcional: `0.1.0` (no publicar `0.0.0`). Una vez publicada, nunca cambiar la copia de `versions/` existente: crear otra versión superior.

## Publicar una nueva versión

1. Completar y probar el userscript en `src/Rs-ESPN-CBB-Resultados.user.js`.
2. Agregar `## [X.Y.Z] - AAAA-MM-DD` y sus cambios a `CHANGELOG.md`.
3. Desde `CBB/`, ejecutar `npm test`.
4. Ejecutar `npm run release -- X.Y.Z --dry-run` para validar sin escribir.
5. Ejecutar `npm run release -- X.Y.Z` para generar `dist/`, `versions/` y actualizar `VERSION`.
6. Revisar y confirmar los cambios mediante Git; subirlos a `main`. Opcional: etiquetar el commit `cbb-vX.Y.Z`.
7. Verificar el archivo estable publicado en GitHub antes de comprobar actualizaciones desde Firefox/Tampermonkey.

El publicador **no** modifica Git, hace commits ni instala scripts; no puede publicar un loader vacío.

## Tampermonkey (Firefox)

Al publicar se incorporan automáticamente los siguientes metadatos en la versión instalable:

- `@version`: versión `X.Y.Z` recién publicada.
- `@updateURL`: `https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB/dist/Rs-ESPN-CBB-Resultados.user.js`
- `@downloadURL`: la misma URL estable.

**Importante:** instalar siempre la versión estable desde `dist/`. Las copias de `versions/` son para auditoría y recuperación, no para instalación permanente con actualizaciones automáticas; las copias llevan URL de actualización estable y eventualmente migrarían a la última edición.

La actualización depende de que `main` incluya la nueva versión y de que Tampermonkey ejecute su comprobación de actualizaciones. Cambios locales en el editor no equivalen a versiones publicadas.

## Reglas del loader futuro

Distinguir inequívocamente CBB de CFB y NBA en el contexto Rover; no llenar otra liga. Mantener relación de equipo visitante/local, fecha `America/New_York`, estados y parciales de baloncesto (H1, H2, OT), y escritura protegida de los campos correspondientes. La validación de partidos y el mapping quedan pendientes de integración funcional.
