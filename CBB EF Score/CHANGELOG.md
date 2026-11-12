# Cambios

## 0.0.10 — 2026-11-12

West Florida cambia del código Rover 10641 al actual **275**, confirmado por el usuario. Conserva ESPN **2697** y FOX **441**. Se retira 10641 del mapa activo para evitar duplicar la identidad. El total permanece en 346 equipos y el CSV se sincroniza con el mapa completo.

## 0.0.9 — 2026-11-08

Lista de 28 encuentros Rover (56 equipos): 45 ya estaban registrados y se añaden 11 identidades confirmadas con ESPN (API) y FOX CBK (página oficial). El mapa pasa de 335 a 346 equipos; la lógica de resultados no cambia.

| Rover | Equipo | ESPN | FOX |
|---|---|---|---|
| 861 | Sacred Heart | 2529 | 207 |
| 983 | MASS Lowel | 2349 | 970 |
| 802 | Fairfield | 2217 | 148 |
| 799 | Princeton | 163 | 145 |
| 631 | Albany | 399 | 133 |
| 969 | Boise State | 68 | 95 |
| 778 | Green Bay | 2739 | 130 |
| 836 | Drake | 2181 | 183 |
| 832 | Norfolk | 2450 | 178 |
| 755 | William & Mary | 2729 | 112 |
| 785 | CS Bakersfield | 2934 | 335 |

Se conserva el código Rover 831 de North Carolina A&T y se confirma Albany 631 y Boise State 969. Se incluyen el fixture de 28 encuentros y pruebas de regresión para las 56 identidades. Las formas abreviadas de Rover, incluida MASS Lowel, se conservan exactamente.

## 0.0.8 — 2026-11-07

Segunda lista del usuario: 59 encuentros NCAA y 118 equipos distintos. 94 ya estaban incluidos y se añaden los 24 restantes, con ID y nombre confirmados en ESPN y FOX CBK. El mapa queda en 335 equipos. West Florida se incorpora con Rover 10641, ESPN 2697 y FOX 441.

| Rover | Nombre Rover | ESPN | FOX |
|---|---|---|---|
| 10641 | West Florida | 2697 | 441 |
| 950 | Florida Internationa | 2229 | 293 |
| 896 | South Carolina St | 2569 | 180 |
| 909 | UNC Greensboro | 2430 | 258 |
| 691 | Villanova | 222 | 58 |
| 865 | Austin Peay | 2046 | 211 |
| 657 | Kennesaw State | 338 | 858 |
| 686 | Rutgers | 164 | 63 |
| 744 | Delaware | 48 | 2 |
| 920 | Nicholls | 2447 | 264 |
| 777 | Detroit | 2174 | 127 |
| 762 | Southern Miss | 2572 | 116 |
| 945 | Mississippi Valley S | 2400 | 278 |
| 637 | Stony Brook | 2619 | 136 |
| 779 | Illinois (UIC) | 82 | 128 |
| 842 | Southern Illinois | 79 | 188 |
| 852 | Wyoming | 2751 | 198 |
| 952 | Middle Tenn | 2393 | 295 |
| 698 | North Colorado | 2458 | 395 |
| 972 | Idaho | 70 | 98 |
| 386 | Tarleton State | 2627 | 432 |
| 965 | San Diego | 301 | 308 |
| 964 | Portland | 2501 | 306 |
| 927 | UT Arlington | 250 | 270 |

Los 311 registros anteriores y el motor de resultados se conservan íntegros. Los cuatro encuentros finales entre clubes internacionales se registran como excluidos del alcance NCAA en `data/rover-59-encounters-2026-11-07.json`. La fecha identifica la recepción de la lista, no la fecha de los partidos.

## 0.0.7 — 2026-11-07

Revisión de los 92 equipos de los 46 encuentros aportados por el usuario: 68 ya estaban y se añaden los 24 restantes. El mapa queda en 311 equipos. Los IDs y nombres de cada equipo nuevo se verificaron en el endpoint oficial de equipos ESPN y el header de equipos FOX CBK. IUPUI corresponde a IU Indianapolis / IU Indy (ESPN 85, FOX 283); Houston Christian conserva su identidad propia (ESPN 2277, FOX 662).

| Rover | Nombre Rover | ESPN | FOX |
|---|---|---|---|
| 831 | N. Carolina A&T | 2448 | 179 |
| 750 | UNC Wilmington | 350 | 108 |
| 918 | Lamar | 2320 | 261 |
| 743 | UC Santa Barbara | 2540 | 102 |
| 979 | Omaha | 2437 | 826 |
| 905 | Samford | 2535 | 38 |
| 931 | IUPUI | 85 | 283 |
| 710 | VMI | 2678 | 259 |
| 841 | Northern Iowa | 2460 | 187 |
| 975 | New Mexico State | 166 | 299 |
| 946 | Prairie View A&M | 2504 | 279 |
| 982 | UT Rio Grande Valley | 292 | 138 |
| 830 | Morgan State | 2415 | 177 |
| 769 | Houston Christian | 2277 | 662 |
| 659 | Mercer | 2382 | 37 |
| 742 | UC Riverside | 27 | 476 |
| 739 | Pacific | 279 | 100 |
| 834 | Bradley | 71 | 181 |
| 773 | Utah Valley | 3084 | 437 |
| 970 | Fresno State | 278 | 311 |
| 134 | UC San Diego | 28 | 610 |
| 700 | Sacramento State | 16 | 74 |
| 699 | Portland State | 2502 | 73 |
| 741 | UC Irvine | 300 | 101 |

Se conservan íntegros los 287 registros anteriores y el motor de resultados de 0.0.6. La lista original queda en `data/rover-46-encounters-2026-11-07.json`; el nombre de archivo identifica la fecha de recepción, no la fecha de los partidos.

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
