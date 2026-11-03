# Cambios

## 0.0.6 — 2026-11-03

Q1 y Q3 se rellenan con `0` para ambos equipos al confirmar descanso, recuperar H1 durante H2 o confirmar el final. H1 sigue en Q2 y H2 en Q4. Las pruebas unitarias y de Firefox verifican los ceros en CLASSIC y RV2.

## 0.0.5 — 2026-11-03

Publicación en `Nox1do/rover-basketball`, carpeta `CBB EF Score`. Instalación y actualizaciones de Tampermonkey mediante rutas Raw estables: `.meta.js` para comprobar la versión y `.user.js` para descargarla. Se añade `scripts/release.mjs` para sincronizar código, mapa, versión, distribución e histórico, junto con comprobaciones automáticas de GitHub Actions y pruebas del publicador.

Los 287 equipos, la distribución Q2/Q4 y las validaciones de resultados mantienen el comportamiento de 0.0.4. El histórico conserva las versiones 0.0.1–0.0.4 entregadas anteriormente.

## 0.0.4 — 2026-11-03

California Baptist cambia del código Rover 19210 al actual **984**, indicado por el usuario. Conserva ESPN **2856** y FOX **648**. El código anterior se retira del mapa activo para mantener una única identidad por nombre en RV2. El total permanece en 287 equipos.

## 0.0.3 — 2026-11-03

Revisión de cobertura de los 11 encuentros de la captura `cbb 11.jpg` (22 equipos). Faltaban tres códigos, verificados en los APIs oficiales ESPN/FOX y añadidos:

| Rover | Nombre Rover | ESPN | FOX |
|---|---|---|---|
| 277 | Saint Josephs | 2603 | 18 |
| 843 | Wichita State | 2724 | 190 |
| 901 | Auburn | 2 | 245 |

El mapa queda en 287 equipos. Los 11 encuentros ya tienen ambos equipos mapeados en los dos proveedores. La revisión es de cobertura de equipos y no asigna una fecha u hora a la imagen, que no las especifica.

## 0.0.2 — 2026-11-03

Ocho códigos reportados por el usuario añadidos al mapa. Identidades verificadas mediante los endpoints oficiales de equipos ESPN y headers FOX CBB. El mapa contiene 284 equipos y conserva los 276 registros anteriores.

| Rover | Nombre Rover | ESPN | FOX |
|---|---|---|---|
| 791 | SIU Edwars | 2565 | 411 |
| 786 | Longwood | 2344 | 376 |
| 737 | CS North | 2463 | 67 |
| 922 | Southeastern Louisia | 2545 | 267 |
| 772 | South Dakota | 233 | 416 |
| 877 | California | 25 | 222 |
| 932 | ND State | 2449 | 490 |
| 962 | Loyola Marymount | 2351 | 304 |

California se identifica con California Golden Bears, South Dakota con Coyotes y CS North con Cal State Northridge Matadors. Se conservan las abreviaturas Rover para reconocer sus filas.

## 0.0.1 — 2026-11-02

Primera versión basada en CFB FOX 1.0.13, con 276 equipos, H1 → Q2, H2 → Q4, OT y total, validación ESPN/FOX y adaptadores CLASSIC/RV2. 51 pruebas superadas (40 unitarias y 11 Firefox).
