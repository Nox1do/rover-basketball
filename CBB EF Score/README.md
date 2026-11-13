# CBB Espn-Fox 0.0.11

Userscript para Firefox + Tampermonkey que adapta CFB FOX 1.0.13 a NCAA masculina. ESPN aporta los resultados y FOX los confirma antes de llenar el editor Rover. Incluye 347 equipos Rover con equivalencias ESPN y FOX propias de basketball.

## Instalación y uso

1. Abre [Instalar / actualizar desde GitHub](https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB%20EF%20Score/dist/CBB-Espn-Fox.user.js) y confirma en Tampermonkey. Instala esta versión una vez para sustituir la copia local 0.0.4 y activar las rutas de actualización GitHub. Si Firefox abre el archivo como texto, copia [dist/CBB-Espn-Fox.txt](dist/CBB-Espn-Fox.txt) en el editor de Tampermonkey.
2. Abre resultados Rover en `roversport.net` o `roversport.lol`, CATEGORY **BASKETBALL**, LEAGUE **CBB**. Si cambias liga o fecha, pulsa Search para refrescar la tabla.
3. Selecciona un partido. La barra CBB intenta vincularlo con ESPN y prepara la equivalencia FOX.
4. Pulsa **↻** para consultar y llenar. Si ambas fuentes confirman H1 o Final y coinciden, se actualizan los campos. Si faltan datos o las fuentes difieren, quedan sin modificar.
5. **✎** permite buscar un vínculo manual o introducir el ESPN Event ID. **×** desactiva el vínculo automático para ese evento; **AUTO** lo reactiva. Estas preferencias son propias de CBB y no comparten claves con CFB.

El vínculo manual sigue obligado a superar la comprobación de equipos, fecha y resultados. La interfaz conserva el comportamiento de CFB FOX; no se ha añadido un temporizador de llenado. Guardar/procesar resultados sigue siendo una acción del usuario. El script no hace peticiones POST ni pulsa Guardar/Procesar.

## Distribución confirmada por el usuario

| Dato NCAA | Casilla Rover |
|---|---|
| Primera mitad (H1) | Q2 |
| Segunda mitad (H2) | Q4 |
| Q1 y Q3 | 0 |
| Suma de prórrogas | OT |
| Resultado total | F / TOT |

En el descanso se coloca H1 en Q2 y en el total, Q1/Q3 reciben 0, se vacían Q4/OT y se selecciona **H1 COMPLETADO** (`2`). Si se consulta durante H2, puede recuperar H1 usando su parcial, sin confundirlo con el marcador actual. No degrada un Rover ya finalizado a H1.

Al final se rellenan Q2, Q4, OT y TOT; Q1/Q3 reciben 0 y el estado pasa a **FINALIZADO** (`3`). `Edited` pasa a `1` cuando hay cambios. Los datos se asignan a T1/T2 por ID de equipo, también si la localía difiere entre proveedores.

## Validaciones

- ESPN y FOX deben identificar el mismo partido y la misma fecha en America/New_York, independientemente de la zona de la PC.
- H1/H2/OT deben sumar el total final y coincidir entre fuentes. Un cero es válido; un dato ausente no se convierte en cero.
- En múltiples prórrogas se compara la suma OT; también se compara cada período cuando ambas fuentes ofrecen desglose múltiple.
- Cancelado, pospuesto y suspendido no se interpretan como Final, aunque una fuente marque `completed`.
- Un cambio de liga, fecha, SN o equipos durante la consulta invalida el llenado.
- Si falta cualquiera de los controles previstos, no comienza a escribir.
- Temporada 2026-27: ESPN `season=2027`; FOX `season=2026`. El corte de temporada es julio, como en CBB Lloader.

## Diagnóstico

API de consola: `window.__CBB_ESPN_FOX` (alias `__CBB_FOX`).

- `mapStats()` — cobertura del mapa.
- `getCurrentRoverEvent()` — identidad y fecha del evento seleccionado.
- `getContextGate()` — estado de filtros/tabla pendiente de Search.
- `readGameFresh()` — lectura ESPN sin llenar.
- `diagHalftime()` — mitades y detección de descanso.
- `diagPerformance()` — cachés y tiempos.
- `clearCache()` — limpiar cachés ESPN/FOX.

## Código y pruebas

`src/CBB-Espn-Fox.user.js` es la fuente editable. `data/` contiene el mapa completo y sus referencias. `tests/fixtures/` conserva los campos consumidos de respuestas públicas capturadas; las situaciones de descanso y OT de las pruebas son sintéticas y están separadas de las capturas reales. No se incluye la clave pública FOX en los fixtures ni se almacena ninguna credencial del usuario.

Requiere Node >=22 para ejecutar las pruebas:

```sh
npm ci
npx playwright install firefox
npm run check
npm test
```

Dentro del contenedor administrado se usó `CBB_FIREFOX_CONTAINER=1 npm test`; esa opción afecta únicamente al Firefox de pruebas dentro del contenedor y no cambia la configuración del Firefox del usuario.

Las pruebas cubren lógica de resultados, publicación/versionado e integración DOM en Firefox 153.0 de Playwright. Las peticiones HTTP del navegador se sustituyen por fixtures y se verifica que el botón no envía el formulario. Las capturas reales incluyen Michigan–Duke final y un estado en vivo de ESPN/FOX. La comparación final real coincide: Michigan 33/30/63, Duke 35/33/68.

Esta validación no equivale a una ejecución dentro de Tampermonkey en la sesión autenticada real de Rover. Los handlers propios de Rover para `input/change` no están disponibles en los fixtures; el script conserva los eventos del CFB original. La compatibilidad CLASSIC y RV2 se ha ejercitado sobre reproducciones del DOM, con los IDs `Basq` aportados por el usuario.

## Actualizaciones por GitHub

La ruta estable es `dist/CBB-Espn-Fox.user.js`; `dist/CBB-Espn-Fox.meta.js` anuncia la versión. Tampermonkey usa esas rutas para comprobar y descargar actualizaciones según su configuración; también puedes pulsar **Buscar actualizaciones** en la extensión. El nombre y namespace se conservan para actualizar la misma instalación.

Para publicar cambios futuros:

1. Edita `src/CBB-Espn-Fox.user.js` y, para equipos, `data/cbb-rover-espn-fox-team-map.json`.
2. Añade una entrada `## 0.0.12` (o la siguiente versión) en `CHANGELOG.md`.
3. Ejecuta `npm run release -- 0.0.12 --dry-run` y luego `npm run release -- 0.0.12`. El publicador regenera el mapa embebido y sincroniza versión, código, dist, metadata y snapshot histórico; nunca sobrescribe una versión archivada.
4. Ejecuta `npm run check` y `npm test`, y confirma los cambios en GitHub.

`VERSION`, `package.json`, `package-lock.json`, el encabezado y la constante VERSION quedan sincronizados. `versions/` conserva las versiones históricas, incluidas 0.0.1–0.0.4. GitHub Actions comprueba integridad de la publicación y ejecuta las pruebas en Node 22 y Firefox al recibir cambios de esta carpeta. Las copias de `dist/` se generan mediante el publicador; la fuente editable está en `src/`.

## Referencias

- [CBB Lloader y mapa Rover/ESPN](https://github.com/Nox1do/rover-basketball/tree/main/CBB)
- [Equipos FOX NCAA](https://www.foxsports.com/college-basketball/team-stats?season=2026&category=scoring)
- [Tampermonkey HTTP](https://www.tampermonkey.net/documentation.php?q=api:GM_xmlhttpRequest)
- [Playwright Firefox](https://playwright.dev/docs/browsers#firefox)
