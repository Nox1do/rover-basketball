// ==UserScript==
// @name         Rs - ESPN CBB LLoader
// @namespace    https://roversport.net/
// @version      0.1.12
// @description  CBB LLoader: coloca links ESPN, comprueba horarios y equipos invertidos; no llena resultados.
// @author       noeg
// @match        https://www.roversport.lol/adm/es/index.php*
// @match        https://www.roversport.net/adm/es/index.php*
// @include      /^https?:\/\/(?:www\.)?roversport\.[^/]+\/adm\/es\/index\.php(?:\?.*)?$/
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        unsafeWindow
// @connect      site.api.espn.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB/dist/Rs-ESPN-CBB-LLoader.user.js
// @downloadURL  https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB/dist/Rs-ESPN-CBB-LLoader.user.js
// ==/UserScript==

(() => {
    "use strict";

    const VERSION = "0.1.12";
    // Rover usa America/New_York, independientemente de la zona horaria del equipo.
    const ROVER_TIME_ZONE = "America/New_York";
    const TAG = "[CBB LLoader]";
    // Previous versions shared the same panel ID. An older script may own
    // the UI even while newer code is running. Separate the new UI namespace.
    const PANEL_ID = "cbb-lloader-panel-v2";
    const STYLE_ID = "cbb-lloader-style-v2";
    const LAUNCHER_ID = "cbb-lloader-launcher-v2";
    const LEGACY_PANEL_ID = "cbb-lloader-panel";
    const LEGACY_LAUNCHER_ID = "cbb-lloader-launcher";
    const ESPN_GAME_URL = id =>
        `https://www.espn.com/mens-college-basketball/game/_/gameId/${id}`;

    // Mapeo CBB 2026-27: 287 identificadores Rover verificados contra ESPN.
    // No mezclar con los IDs Rover usados en CFB: son deportes distintos.
    const TEAM_IDS = {"133":"2815","135":"3101","176":"2900","179":"88","254":"2546","270":"2330","277":"2603","285":"2441","300":"2837","381":"2698","382":"2385","388":"91","400":"526","581":"2608","632":"2066","633":"104","635":"311","636":"160","638":"2378","639":"261","640":"103","641":"228","642":"150","643":"52","644":"59","645":"120","646":"2390","647":"152","648":"153","649":"258","650":"259","651":"154","652":"2057","653":"2097","654":"2193","658":"288","660":"2454","661":"2908","662":"56","663":"2429","664":"2168","665":"2184","666":"2230","667":"45","668":"2325","669":"113","670":"227","671":"257","673":"179","674":"139","676":"2752","677":"2132","678":"41","679":"305","680":"46","681":"97","682":"269","684":"221","685":"2507","687":"2550","688":"58","689":"2599","690":"183","692":"277","693":"331","694":"304","695":"149","696":"147","697":"2464","701":"2692","702":"2127","703":"324","704":"2241","705":"2272","706":"2335","707":"2506","708":"2515","709":"2427","711":"2737","712":"356","713":"84","714":"2294","715":"130","716":"127","717":"135","718":"77","719":"194","720":"213","721":"2509","722":"275","723":"239","724":"38","725":"66","726":"2305","727":"2306","728":"142","729":"158","730":"201","731":"197","732":"251","733":"2511","734":"2641","736":"2239","737":"2463","738":"299","740":"302","745":"2182","746":"2244","747":"2247","749":"256","751":"111","752":"295","753":"119","754":"2670","756":"151","757":"248","758":"276","759":"235","763":"2655","765":"5","766":"2116","767":"2638","768":"2130","770":"2885","771":"155","772":"233","774":"245","775":"2086","776":"325","780":"2350","781":"270","782":"2674","783":"2750","784":"2754","786":"2344","787":"2428","788":"2443","790":"2547","791":"2565","793":"225","794":"171","795":"172","796":"159","800":"43","801":"2099","803":"314","804":"2352","805":"2363","806":"2368","807":"315","808":"2520","809":"2561","810":"2612","811":"2006","812":"189","813":"2084","814":"2309","815":"193","816":"195","817":"2050","818":"2117","819":"2199","820":"2459","821":"2649","822":"2711","823":"2065","824":"2154","826":"50","827":"2261","828":"47","829":"2379","835":"156","838":"2287","839":"282","843":"2724","844":"2005","845":"252","846":"36","847":"167","848":"21","849":"2628","850":"2439","851":"254","853":"2803","854":"2115","855":"161","856":"112358","857":"2405","858":"116","859":"2514","860":"2523","864":"2681","866":"2197","869":"2413","870":"93","872":"2634","873":"2635","874":"2630","875":"12","876":"9","877":"25","878":"2483","879":"204","880":"24","881":"26","882":"30","883":"264","884":"265","885":"44","886":"349","887":"2083","888":"2142","889":"107","890":"2253","891":"2329","892":"2426","893":"57","894":"61","895":"96","897":"2633","898":"238","899":"333","900":"8","901":"2","902":"99","903":"145","904":"344","906":"2026","907":"236","908":"2210","910":"2717","911":"2643","913":"2166","914":"231","915":"290","916":"2747","917":"2110","919":"2377","921":"2466","922":"2545","923":"2534","925":"357","926":"326","928":"2636","930":"2870","932":"2449","933":"2473","934":"198","935":"2571","937":"140","938":"2710","940":"2011","941":"2016","942":"2029","943":"2755","944":"2296","947":"2582","948":"2640","949":"98","951":"2226","953":"6","954":"2653","955":"2031","956":"2032","957":"2172","959":"309","960":"2433","961":"2250","962":"2351","963":"2492","966":"2539","967":"2541","971":"62","973":"2348","974":"2440","976":"23","977":"328","980":"94","981":"322","985":"2916","987":"2453","988":"2000","996":"2579","997":"218","998":"2567","999":"2771","19210":"2856"};


    // Prevent competing intervals/panels when the same loader is injected twice.
    // Legacy v0.1.0/v0.1.1 instances do not have this contract and must be disabled in Tampermonkey.
    const RUNTIME_KEY = "__CBB_LLOADER_RUNTIME__";
    const runtimeWindow = typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : window;
    const previousRuntime = runtimeWindow[RUNTIME_KEY];
    const versionNumber = version => String(version || "").split(".").reduce((value, part) => value * 1000 + Number(part || 0), 0);
    if (previousRuntime?.active) {
        if (versionNumber(previousRuntime.version) >= versionNumber(VERSION)) {
            console.warn(`${TAG} v${VERSION}: otra instancia igual o más reciente ya está activa; omitida.`);
            return;
        }
        previousRuntime.dispose?.();
    }
    let panelPollId = null;
    const runtime = {
        version: VERSION,
        active: true,
        dispose() {
            if (!this.active) return;
            this.active = false;
            if (panelPollId !== null) clearInterval(panelPollId);
            document.getElementById(PANEL_ID)?.remove();
            document.getElementById(LAUNCHER_ID)?.remove();
        }
    };
    runtimeWindow[RUNTIME_KEY] = runtime;

    const state = {
        phase: "idle",
        plan: [],
        stopRequested: false,
        scoreboardCache: new Map(),
        scheduleCache: new Map(),
        log: [],
        viewActive: null,
        planSignature: "",
        planSelectedDate: "",
        linkAudit: [],
        auditSignature: "",
        legacyCollision: false
    };

    const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
    const upper = value => clean(value).toUpperCase();
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function expose(name, value) {
        try { window[name] = value; } catch (_) {}
        try {
            if (typeof unsafeWindow !== "undefined") unsafeWindow[name] = value;
        } catch (_) {}
    }

    function hasLegacyCollision() {
        return Boolean(document.getElementById(LEGACY_PANEL_ID) ||
            document.getElementById(LEGACY_LAUNCHER_ID));
    }
    function requireSingleLoader() {
        if (hasLegacyCollision()) throw new Error(
            "Hay otra versión de CBB LLoader activa. Desactívala en Tampermonkey y recarga la página antes de guardar enlaces."
        );
    }
    function uiDiagnostics() {
        return {
            version: VERSION, panelId: PANEL_ID,
            label: document.getElementById(PANEL_ID)?.querySelector(".cbbll-version")?.textContent || "",
            legacyPanelPresent: Boolean(document.getElementById(LEGACY_PANEL_ID)),
            legacyLauncherPresent: Boolean(document.getElementById(LEGACY_LAUNCHER_ID)),
            legacyCollision: hasLegacyCollision()
        };
    }

    function isVisible(element) {
        if (!element) return false;
        const style = getComputedStyle(element);
        return style.display !== "none" &&
            style.visibility !== "hidden" &&
            element.getClientRects().length > 0;
    }

    function findSelectByLabel(labelText) {
        const wanted = upper(labelText);
        for (const label of document.querySelectorAll("label")) {
            if (!upper(label.textContent).includes(wanted)) continue;
            const linked = label.htmlFor && document.getElementById(label.htmlFor);
            if (linked?.tagName === "SELECT") return linked;
            const local = label.parentElement?.querySelector("select");
            if (local) return local;
        }
        // Fallback only when no accessible label is available.
        for (const select of document.querySelectorAll("select")) {
            const selected = upper(select.options[select.selectedIndex]?.textContent);
            if (wanted === "CATEGORY" && /^(BASKETBALL|BALONCESTO|BASKET)$/.test(selected)) return select;
            if (wanted === "LEAGUE" && /^(CBB|NCAAB|NCAAM|NCAA MEN(?:'S)?|MEN'S COLLEGE BASKETBALL)$/.test(selected)) return select;
        }
        return null;
    }

    function selectedValue(select) {
        return {
            value: upper(select?.value),
            text: upper(select?.options?.[select.selectedIndex]?.textContent)
        };
    }

    function isCollegeBasketballLeague(value) {
        const v = upper(value).replace(/\s+/g, " ");
        return /^(CBB|NCAAB|NCAAM|NCAA MEN(?:'S)?|MEN'S COLLEGE BASKETBALL)$/.test(v);
    }

    function isBasketballCategory(value) {
        return /^(BASKETBALL|BALONCESTO|BASKET)$/.test(upper(value));
    }

    function hasCBBMarker(root) {
        if (!root) return false;
        if (root.querySelector('[data-liga="CBB" i], [data-league="ncaam" i], [data-league="ncaab" i], [data-league="cbb" i], [data-slug="ncaam" i], [data-slug="cbb" i]')) return true;
        return [...root.querySelectorAll("tr.ge-liga-row")].some(row =>
            isCollegeBasketballLeague(clean(row.textContent).split(/\s+\d+\s+eventos?/i)[0]) ||
            /^(CBB|NCAAB|NCAAM)\b/i.test(clean(row.textContent))
        );
    }

    function leagueFromHeaderRow(row) {
        const explicit = clean(row?.querySelector("[data-liga]")?.dataset.liga);
        if (explicit) return isCollegeBasketballLeague(explicit) ? "CBB" : upper(explicit);
        const slug = clean(row?.querySelector("[data-league], [data-slug]")?.dataset.league ||
            row?.querySelector("[data-slug]")?.dataset.slug);
        if (/^(ncaab|ncaam|cbb)$/i.test(slug)) return "CBB";
        const header = upper(row?.textContent);
        if (/^(CBB|NCAAB|NCAAM)\b/.test(header)) return "CBB";
        return "OTHER";
    }

    function getCBBRows(table) {
        if (!table) return [];
        const rows = [...table.querySelectorAll("tbody > tr")];
        const hasGroups = rows.some(row => row.classList.contains("ge-liga-row"));
        if (!hasGroups) {
            // Legacy table without group headings: allow only an explicit category+league selection.
            const cat = selectedValue(findSelectByLabel("CATEGORY"));
            const league = selectedValue(findSelectByLabel("LEAGUE"));
            return (isBasketballCategory(cat.value) || isBasketballCategory(cat.text)) &&
                (isCollegeBasketballLeague(league.value) || isCollegeBasketballLeague(league.text))
                ? rows : [];
        }
        const result = [];
        let currentLeague = "";
        for (const row of rows) {
            if (row.classList.contains("ge-liga-row")) {
                currentLeague = leagueFromHeaderRow(row);
                continue;
            }
            if (currentLeague === "CBB") result.push(row);
        }
        return result;
    }

    function looksLikeEventTable(table) {
        if (!table) return false;
        const headers = [...table.querySelectorAll("th")]
            .map(header => upper(header.textContent));
        const headerText = headers.join(" | ");
        const hasCoreHeaders =
            headerText.includes("AWAY") &&
            headerText.includes("HOME") &&
            (headerText.includes("ACTION") || headerText.includes("ACCION"));
        const hasRows = table.querySelectorAll("tbody tr, tr[tkt]").length > 0;
        return hasCoreHeaders && hasRows;
    }

    function findEventTable() {
        const preferred = document.querySelector("#tablaEventos");
        if (preferred && (hasCBBMarker(preferred) || looksLikeEventTable(preferred))) return preferred;
        const candidates = [...document.querySelectorAll("table")].filter(looksLikeEventTable);
        return candidates.find(hasCBBMarker) || null;
    }

    function isCBBView() {
        const table = findEventTable();
        if (!table) return false;
        const categorySelect = findSelectByLabel("CATEGORY");
        const leagueSelect = findSelectByLabel("LEAGUE");
        if (categorySelect || leagueSelect) {
            // Mixed or stale views cannot be implicitly identified by old table markup.
            if (!categorySelect || !leagueSelect) return false;
            const cat = selectedValue(categorySelect);
            const league = selectedValue(leagueSelect);
            return (isBasketballCategory(cat.value) || isBasketballCategory(cat.text)) &&
                (isCollegeBasketballLeague(league.value) || isCollegeBasketballLeague(league.text));
        }
        return hasCBBMarker(table);
    }

    function getGlobalIsoDate() {
        const controls = document.querySelectorAll(
            'input[name="fecha"], input[id="fecha"], input[type="date"]'
        );

        for (const control of controls) {
            const value = clean(control.value);
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        }

        return "";
    }

    function rowDate(row) {
        const globalDate = getGlobalIsoDate();
        if (globalDate) return globalDate;

        const raw = clean(row?.getAttribute("data-content"));
        const iso = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
        if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

        const short = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
        if (!short) return "";

        const first = Number(short[1]);
        const second = Number(short[2]);
        if (first > 12) {
            return `${short[3]}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`;
        }
        if (second > 12) {
            return `${short[3]}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`;
        }

        // Rover históricamente usa DD/MM/YYYY en data-content.
        return `${short[3]}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`;
    }

    function parseTeamCell(cell) {
        const lines = String(cell?.innerText || cell?.textContent || "")
            .split(/[\r\n]+/)
            .map(clean)
            .filter(Boolean);

        for (const line of lines) {
            const match = line.match(/^(\d{2,5})\s+(.+)$/);
            if (match) {
                return { roverCode: match[1], roverName: clean(match[2]) };
            }
        }

        const whole = clean(cell?.innerText || cell?.textContent);
        const match = whole.match(/(?:^|\s)(\d{2,5})\s+(.+)$/);
        return match
            ? { roverCode: match[1], roverName: clean(match[2]) }
            : null;
    }

    // Hora de Rover: preferir la columna HORA de la tabla, no horarios de
    // elementos adyacentes (marcador, controles, otros deportes o modales).
    function parseClockMinutes(value) {
        const text = upper(value).replace(/\u00a0/g, " ");
        const match = text.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?(?=\s|$)/);
        if (!match) return null;
        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const period = match[3] || "";
        if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;
        if (period) {
            if (hour < 1 || hour > 12) return null;
            hour = hour % 12 + (period === "PM" ? 12 : 0);
        } else if (hour > 23) {
            return null;
        }
        return hour * 60 + minute;
    }

    function formatClockMinutes(minutes) {
        if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 1440) return "";
        const hour = Math.floor(minutes / 60);
        return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
    }

    function extractRoverTime(row) {
        const cells = [...(row?.querySelectorAll("td") || [])];
        const table = row?.closest?.("table");
        const headers = [...(table?.querySelectorAll("thead tr") || [])]
            .at(-1)?.querySelectorAll("th") || [];
        const timeIndex = [...headers].findIndex(head => /\b(HORA|TIME)\b/.test(upper(head.textContent)));
        const candidates = [];
        if (timeIndex >= 0 && cells[timeIndex]) {
            candidates.push(cells[timeIndex].textContent);
        }
        // Prioridad siguiente: elementos explícitamente identificados como hora.
        const labelled = row?.querySelector?.(
            '[data-label="Hora" i], [data-label="Time" i], [data-hora], .ge-hora, .ge-time'
        );
        if (labelled) {
            candidates.push(labelled.getAttribute?.("data-hora"), labelled.textContent);
        }
        candidates.push(row?.dataset?.hora, row?.dataset?.time);
        // Respaldo estricto: solo una celda que contenga EXCLUSIVAMENTE una hora.
        for (const cell of cells) {
            const text = clean(cell.textContent);
            if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?$/i.test(text)) {
                candidates.push(text);
            }
        }
        for (const rawValue of candidates) {
            const minutes = parseClockMinutes(rawValue);
            if (Number.isInteger(minutes)) {
                return { raw: clean(rawValue), minutes, label: formatClockMinutes(minutes) };
            }
        }
        return { raw: "", minutes: null, label: "" };
    }

    function parseRoverRow(row) {
        const cells = [...(row?.querySelectorAll("td") || [])];
        const teamLinks = [...(row?.querySelectorAll(".ge-team-link[data-team]") || [])];
        const explicitTeams = teamLinks.map(link => {
            const roverCode = clean(link.dataset.team);
            const clone = link.cloneNode(true);
            clone.querySelectorAll(".ge-team-cod, img").forEach(node => node.remove());
            const roverName = clean(clone.textContent)
                .replace(new RegExp(`^${roverCode}\\s*`), "")
                .trim();
            return roverCode && roverName
                ? { roverCode, roverName }
                : null;
        }).filter(Boolean);
        const teams = explicitTeams.length >= 2
            ? explicitTeams
            : cells.map(parseTeamCell).filter(Boolean);
        if (teams.length < 2) return null;

        const onclick = row.getAttribute("onclick") || "";
        const eventId = clean(
            row.getAttribute("tkt") ||
            (/^\d+$/.test(row.id) ? row.id : "") ||
            row.dataset.eventId ||
            row.dataset.rsSnValue ||
            onclick.match(/(?:ticketSelected|edit\w*event\w*)\s*\(\s*['\"]?(\d+)/i)?.[1] ||
            cells.map(cell => clean(cell.innerText)).find(value => /^\d{5,}$/.test(value))
        );

        if (!eventId) return null;
        const roverTime = extractRoverTime(row);

        return {
            roverEventId: eventId,
            date: rowDate(row),
            time: roverTime.label,
            timeRaw: roverTime.raw,
            timeMinutes: roverTime.minutes,
            away: teams[0],
            home: teams[1],
            row
        };
    }

    function getRoverEvents() {
        if (!isCBBView()) return [];

        const table = findEventTable();
        if (!table) return [];

        const rows = getCBBRows(table);
        const byId = new Map();

        for (const row of rows) {
            const event = parseRoverRow(row);
            if (event) byId.set(event.roverEventId, event);
        }

        return [...byId.values()];
    }

    function espnGet(url) {
        const options = {
            method: "GET",
            url,
            headers: { Accept: "application/json" },
            timeout: 20000
        };

        if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") {
            return GM.xmlHttpRequest(options).then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(`ESPN HTTP ${response.status}`);
                }
                return JSON.parse(response.responseText);
            });
        }

        if (typeof GM_xmlhttpRequest === "function") {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    ...options,
                    onload(response) {
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error(`ESPN HTTP ${response.status}`));
                            return;
                        }
                        try { resolve(JSON.parse(response.responseText)); }
                        catch (_) { reject(new Error("ESPN devolvió JSON inválido")); }
                    },
                    onerror: () => reject(new Error("Error de red consultando ESPN")),
                    ontimeout: () => reject(new Error("ESPN agotó el tiempo de espera"))
                });
            });
        }

        return Promise.reject(new Error("Tampermonkey no expuso GM.xmlHttpRequest"));
    }

    function easternDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";

        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/New_York",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(date);
        const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
        return `${values.year}-${values.month}-${values.day}`;
    }

    // ESPN entrega timestamps ISO/UTC. Convertir fecha y hora a
    // America/New_York para compararlos con la tabla de Rover.
    function dateTimeInZone(value, timeZone) {
        if (!value) return { date: "", minutes: null, time: "" };
        const instant = new Date(value);
        if (Number.isNaN(instant.getTime())) {
            return { date: "", minutes: null, time: "" };
        }
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hourCycle: "h23"
        }).formatToParts(instant);
        const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
        const hour = Number(fields.hour);
        const minute = Number(fields.minute);
        const minutes = hour * 60 + minute;
        return {
            date: `${fields.year}-${fields.month}-${fields.day}`,
            minutes,
            time: formatClockMinutes(minutes)
        };
    }

    function parseEspnEvent(raw, source) {
        const competition = raw?.competitions?.[0];
        const competitors = competition?.competitors || [];
        const away = competitors.find(item => item.homeAway === "away");
        const home = competitors.find(item => item.homeAway === "home");
        const eventId = String(raw?.id || "");

        if (!eventId || !away || !home) return null;
        const roverZone = dateTimeInZone(raw.date, ROVER_TIME_ZONE);

        return {
            eventId,
            date: raw.date || "",
            easternDate: easternDate(raw.date),
            roverZoneDate: roverZone.date,
            roverZoneTimeMinutes: roverZone.minutes,
            roverZoneTime: roverZone.time,
            name: clean(raw.name || raw.shortName),
            awayEspnId: String(away.team?.id || ""),
            away: clean(away.team?.displayName || away.team?.name),
            homeEspnId: String(home.team?.id || ""),
            home: clean(home.team?.displayName || home.team?.name),
            sources: [source]
        };
    }

    function mergeEvents(collections) {
        const byId = new Map();

        for (const events of collections) {
            for (const event of events || []) {
                const previous = byId.get(event.eventId);
                if (!previous) {
                    byId.set(event.eventId, { ...event });
                } else {
                    previous.sources = [...new Set([...previous.sources, ...event.sources])];
                }
            }
        }

        return [...byId.values()];
    }

    async function fetchScoreboards(dateIso) {
        if (state.scoreboardCache.has(dateIso)) return state.scoreboardCache.get(dateIso);
        const dateParam = dateIso.replace(/-/g, "");
        const variants = [
            { key: "ALL_DIVISION_I", group: "50" },
            { key: "DEFAULT", group: "" }
        ];
        const settled = await Promise.allSettled(variants.map(async variant => {
            const group = variant.group ? `&groups=${variant.group}` : "";
            const url = "https://site.api.espn.com/apis/site/v2/sports/" +
                "basketball/mens-college-basketball/scoreboard" +
                `?dates=${dateParam}&limit=1000${group}`;
            const data = await espnGet(url);
            return (data.events || []).map(event => parseEspnEvent(event, variant.key)).filter(Boolean);
        }));
        const collections = settled.filter(result => result.status === "fulfilled").map(result => result.value);
        if (!collections.length) throw new Error(`Fallaron los scoreboards ESPN para ${dateIso}`);
        const events = mergeEvents(collections);
        state.scoreboardCache.set(dateIso, events);
        return events;
    }

    // NCAA basketball seasons use the spring-ending year, unlike CFB.
    function basketballSeasonYear(dateIso) {
        const year = Number(dateIso.slice(0, 4));
        const month = Number(dateIso.slice(5, 7));
        return String(year + (month >= 7 ? 1 : 0));
    }

    async function fetchTeamSchedule(teamId, season) {
        const key = `${season}:${teamId}`;
        if (state.scheduleCache.has(key)) return state.scheduleCache.get(key);

        const url = "https://site.api.espn.com/apis/site/v2/sports/" +
            `basketball/mens-college-basketball/teams/${encodeURIComponent(teamId)}/schedule` +
            `?season=${encodeURIComponent(season)}`;
        const data = await espnGet(url);
        const events = (data.events || [])
            .map(event => parseEspnEvent(event, "TEAM_SCHEDULE"))
            .filter(Boolean);

        state.scheduleCache.set(key, events);
        return events;
    }

    function describeTimeCandidates(candidates) {
        return [...new Map((candidates || []).map(event => [event.eventId, {
            eventId: event.eventId,
            date: event.roverZoneDate || "",
            time: event.roverZoneTime || "Hora ESPN no disponible"
        }])).values()];
    }

    function findExact(rover, events) {
        const awayId = TEAM_IDS[rover.away.roverCode];
        const homeId = TEAM_IDS[rover.home.roverCode];

        if (!awayId) return { status: "NO_MAP_AWAY" };
        if (!homeId) return { status: "NO_MAP_HOME" };

        // Conservar la selección por fecha ET existente, pero admitir la fecha
        // de República Dominicana cuando cae al día siguiente de NY.
        const sameDate = events.filter(event =>
            (!event.easternDate && !event.roverZoneDate) ||
            event.easternDate === rover.date || event.roverZoneDate === rover.date
        );
        const unique = items => [...new Map(items.map(item => [item.eventId, item])).values()];
        const exact = unique(sameDate.filter(event =>
            event.awayEspnId === awayId && event.homeEspnId === homeId
        ));
        const reversed = unique(sameDate.filter(event =>
            event.awayEspnId === homeId && event.homeEspnId === awayId
        ));

        if (!exact.length && !reversed.length) return { status: "NOT_FOUND" };

        const candidates = [...exact, ...reversed];
        if (!Number.isInteger(rover.timeMinutes)) {
            return {
                status: exact.length ? "NO_TIME" : "REVERSED_PAIR_NO_TIME",
                candidates, timeCandidates: describeTimeCandidates(candidates)
            };
        }

        // No declarar READY si ESPN no facilita una hora comprobable.
        const validTime = event => Number.isInteger(event.roverZoneTimeMinutes) &&
            Boolean(event.roverZoneDate);
        const comparableExact = exact.filter(validTime);
        const comparableReversed = reversed.filter(validTime);
        const matchesDateTime = event =>
            event.roverZoneDate === rover.date &&
            event.roverZoneTimeMinutes === rover.timeMinutes;
        const exactAtTime = comparableExact.filter(matchesDateTime);
        const reversedAtTime = comparableReversed.filter(matchesDateTime);

        if (exactAtTime.length === 1) {
            return { status: "EXACT", match: exactAtTime[0] };
        }
        if (exactAtTime.length > 1) {
            return {
                status: "MULTIPLE_MATCHES",
                candidates: exactAtTime,
                timeCandidates: describeTimeCandidates(exactAtTime)
            };
        }
        if (reversedAtTime.length) {
            return {
                status: "REVERSED_PAIR", candidates: reversedAtTime,
                timeCandidates: describeTimeCandidates(reversedAtTime)
            };
        }
        if (comparableExact.length) {
            return {
                status: "TIME_MISMATCH", candidates: comparableExact,
                timeCandidates: describeTimeCandidates(comparableExact)
            };
        }
        if (comparableReversed.length) {
            return {
                status: "REVERSED_PAIR_TIME_MISMATCH", candidates: comparableReversed,
                timeCandidates: describeTimeCandidates(comparableReversed)
            };
        }
        return {
            status: exact.length ? "NO_ESPN_TIME" : "REVERSED_PAIR_NO_ESPN_TIME",
            candidates, timeCandidates: describeTimeCandidates(candidates)
        };
    }

    async function resolveRoverEvent(rover, dayEvents) {
        let result = findExact(rover, dayEvents);
        if (result.status !== "NOT_FOUND") return result;

        const season = basketballSeasonYear(rover.date);
        const ids = [...new Set([
            TEAM_IDS[rover.away.roverCode],
            TEAM_IDS[rover.home.roverCode]
        ].filter(Boolean))];
        const collections = [];

        for (const teamId of ids) {
            try {
                collections.push(await fetchTeamSchedule(teamId, season));
                result = findExact(rover, mergeEvents(collections));
                if (result.status !== "NOT_FOUND") return result;
            } catch (error) {
                console.warn(`${TAG} Schedule ${teamId}/${season}:`, error);
            }
            await sleep(75);
        }

        return result;
    }

    function currentPlanSignature() {
        return JSON.stringify(getRoverEvents().map(event => [
            event.roverEventId, event.date, event.timeMinutes,
            event.away.roverCode, event.home.roverCode
        ]).sort((a, b) => a[0].localeCompare(b[0])));
    }

    function log(message, kind = "info") {
        const entry = { at: new Date().toISOString(), kind, message };
        state.log.push(entry);
        if (state.log.length > 200) state.log.shift();
        console[kind === "error" ? "error" : kind === "warn" ? "warn" : "log"](
            TAG,
            message
        );
        const panel = document.getElementById(PANEL_ID);
        const line = panel?.querySelector('[data-role="last"]');
        if (line) line.textContent = message;
    }

    function setProgress(done, total) {
        const panel = document.getElementById(PANEL_ID);
        const bar = panel?.querySelector('[data-role="bar"]');
        const count = panel?.querySelector('[data-role="count"]');
        const percent = total ? Math.round((done / total) * 100) : 0;
        if (bar) bar.style.width = `${percent}%`;
        if (count) count.textContent = `${done}/${total}`;
    }

    function planSummary() {
        return state.plan.reduce((summary, item) => {
            summary[item.status] = (summary[item.status] || 0) + 1;
            return summary;
        }, {});
    }

    function timeComparisonLabel(item) {
        const roverTime = clean(item?.rover?.time) || "no disponible";
        const candidates = item?.timeCandidates || [];
        const espnTimes = [...new Set(candidates.map(candidate => {
            const time = clean(candidate.time) || "no disponible";
            const date = clean(candidate.date);
            // Mostrar fecha si ESPN cae en un día diferente al de Rover.
            return date && date !== item?.rover?.date ? `${date} ${time}` : time;
        }))];
        return `Rover ${roverTime} · ESPN ${espnTimes.join(", ") || "no disponible"}`;
    }

    function reviewReason(item) {
        const reasons = {
            NO_MAP_AWAY: `AWAY sin equivalencia ESPN (código ${item.rover.away.roverCode})`,
            NO_MAP_HOME: `HOME sin equivalencia ESPN (código ${item.rover.home.roverCode})`,
            MULTIPLE_MATCHES: `${item.candidates?.length || 2} coincidencias posibles en ESPN para la misma hora (${timeComparisonLabel(item)})`,
            REVERSED_PAIR: `LOCALÍA INVERTIDA · ${timeComparisonLabel(item)}`,
            TIME_MISMATCH: `HORA DIFERENTE · ${timeComparisonLabel(item)}`,
            REVERSED_PAIR_TIME_MISMATCH: `LOCALÍA INVERTIDA Y HORA DIFERENTE · ${timeComparisonLabel(item)}`,
            NO_TIME: `No pude identificar la hora de Rover · ${timeComparisonLabel(item)}`,
            REVERSED_PAIR_NO_TIME: `LOCALÍA INVERTIDA · hora de Rover no disponible · ${timeComparisonLabel(item)}`,
            NO_ESPN_TIME: `ESPN no devolvió una hora comprobable · ${timeComparisonLabel(item)}`,
            REVERSED_PAIR_NO_ESPN_TIME: `LOCALÍA INVERTIDA · ESPN no devolvió hora · ${timeComparisonLabel(item)}`,
            NOT_FOUND: "No se encontró una coincidencia exacta en ESPN",
            NO_DATE: "La fila no tiene una fecha válida",
            ESPN_ERROR: clean(item.error || "Error consultando ESPN"),
            STOPPED: "Análisis detenido antes de revisar este evento"
        };
        return reasons[item.status] || item.status;
    }

    function renderReviewDetails() {
        const panel = document.getElementById(PANEL_ID);
        const details = panel?.querySelector('[data-role="review-details"]');
        const title = panel?.querySelector('[data-role="review-title"]');
        const list = panel?.querySelector('[data-role="review-list"]');
        if (!details || !title || !list) return;

        const items = state.plan.filter(item => item.status !== "READY");
        details.hidden = items.length === 0;
        details.open = items.length > 0;
        title.textContent = `⚠ Requieren revisión (${items.length})`;
        list.replaceChildren();

        for (const item of items) {
            const entry = document.createElement("div");
            entry.className = "cbbll-review-item";

            const matchup = document.createElement("div");
            matchup.className = "cbbll-review-matchup";
            matchup.textContent = `SN ${item.rover.roverEventId} · ` +
                `${item.rover.away.roverName} @ ${item.rover.home.roverName}`;

            const reason = document.createElement("div");
            reason.className = "cbbll-review-reason";
            reason.textContent = reviewReason(item);

            entry.append(matchup, reason);
            list.appendChild(entry);
        }
    }

    function updateButtons() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const analyze = panel.querySelector('[data-action="analyze"]');
        const test = panel.querySelector('[data-action="test"]');
        const load = panel.querySelector('[data-action="load"]');
        const stop = panel.querySelector('[data-action="stop"]');
        const audit = panel.querySelector('[data-action="audit"]');
        const fix = panel.querySelector('[data-action="fix"]');
        const exactCount = state.plan.filter(item =>
            item.status === "READY" &&
            !["SAVED", "ALREADY_LINKED"].includes(item.loadStatus)
        ).length;
        const busy = ["analyzing", "loading", "auditing", "correcting"].includes(state.phase);
        const active = isCBBView();

        analyze.disabled = busy || !active;
        test.disabled = busy || !active || exactCount === 0 || hasLegacyCollision();
        load.disabled = busy || !active || exactCount === 0 || hasLegacyCollision();
        load.textContent = exactCount ? `Cargar ${exactCount} enlaces` : "Cargar enlaces";
        if (audit) audit.disabled = busy || !active;
        const pending = state.linkAudit.filter(isCorrectableAudit).length;
        if (fix) {
            fix.disabled = busy || !active || hasLegacyCollision() || !pending || !state.auditSignature || state.auditSignature !== state.planSignature;
            fix.textContent = pending ? `Corregir ${pending} incorrectos` : "Corregir incorrectos";
        }
        stop.hidden = !busy;
    }

    async function analyze() {
        if (["analyzing", "loading", "auditing", "correcting"].includes(state.phase)) return state.plan;
        if (!isCBBView()) throw new Error("Abre CATEGORY=BASKETBALL y LEAGUE=CBB");

        const roverEvents = getRoverEvents();
        if (!roverEvents.length) throw new Error("No encontré eventos CBB en #tablaEventos");

        state.phase = "analyzing";
        state.plan = [];
        state.linkAudit = [];
        state.auditSignature = "";
        state.planSignature = currentPlanSignature();
        state.planSelectedDate = getGlobalIsoDate();
        renderAudit();
        const oldSummary = document.querySelector(`#${PANEL_ID} [data-role="summary"]`);
        if (oldSummary) oldSummary.textContent = "";
        renderReviewDetails();
        state.stopRequested = false;
        updateButtons();
        setProgress(0, roverEvents.length);
        log(`Analizando ${roverEvents.length} eventos CBB…`);

        const dates = [...new Set(roverEvents.map(event => event.date).filter(Boolean))];
        const days = new Map();

        for (const date of dates) {
            if (state.stopRequested) break;
            try {
                days.set(date, await fetchScoreboards(date));
            } catch (error) {
                days.set(date, error);
            }
        }

        for (let index = 0; index < roverEvents.length; index += 1) {
            const rover = roverEvents[index];

            if (state.stopRequested) {
                state.plan.push({ rover, status: "STOPPED" });
                continue;
            }

            if (!rover.date) {
                state.plan.push({ rover, status: "NO_DATE" });
                setProgress(index + 1, roverEvents.length);
                continue;
            }

            const day = days.get(rover.date);
            if (day instanceof Error || !Array.isArray(day)) {
                state.plan.push({ rover, status: "ESPN_ERROR", error: String(day) });
                setProgress(index + 1, roverEvents.length);
                continue;
            }

            const resolved = await resolveRoverEvent(rover, day);
            state.plan.push({
                rover,
                status: resolved.status === "EXACT" ? "READY" : resolved.status,
                match: resolved.match || null,
                candidates: resolved.candidates || [],
                timeCandidates: resolved.timeCandidates || [],
                url: resolved.status === "EXACT" && resolved.match
                    ? ESPN_GAME_URL(resolved.match.eventId) : ""
            });
            setProgress(index + 1, roverEvents.length);
        }

        state.phase = "ready";
        state.stopRequested = false;
        updateButtons();

        const summary = planSummary();
        renderReviewDetails();
        const inverted = (summary.REVERSED_PAIR || 0) +
            (summary.REVERSED_PAIR_TIME_MISMATCH || 0) +
            (summary.REVERSED_PAIR_NO_TIME || 0) +
            (summary.REVERSED_PAIR_NO_ESPN_TIME || 0);
        const mismatched = (summary.TIME_MISMATCH || 0) +
            (summary.REVERSED_PAIR_TIME_MISMATCH || 0);
        const missing = summary.NOT_FOUND || 0;
        const needsReview = state.plan.length - (summary.READY || 0);
        const summaryText =
            `Análisis listo: ${summary.READY || 0} exactos · ` +
            `${inverted} invertidos · ${mismatched} con hora diferente · ` +
            `${missing} no encontrados · ${needsReview} por revisar.`;
        const visibleSummary = document.querySelector(`#${PANEL_ID} [data-role="summary"]`);
        if (visibleSummary) visibleSummary.textContent = summaryText;
        log(summaryText);
        console.table(state.plan.map(item => ({
            ROVER_EVENT_ID: item.rover.roverEventId,
            FECHA_ROVER: item.rover.date,
            HORA_ROVER_ET: item.rover.time || "NO_TIME",
            ROVER: `${item.rover.away.roverName} @ ${item.rover.home.roverName}`,
            ESPN_EVENT_ID: item.match?.eventId || item.candidates?.map(e => e.eventId).join(", ") || "",
            ESPN: item.match?.name || item.candidates?.[0]?.name || "",
            HORA_ESPN_ET: item.match?.roverZoneTime ||
                item.timeCandidates?.map(e => `${e.date} ${e.time}`).join("; ") || "",
            ESTADO: item.status,
            MOTIVO: item.status === "READY" ? "" : reviewReason(item)
        })));
        return state.plan;
    }

    function findEditButton(row) {
        const exact = row.querySelector('button[onclick^="geEeOpen("][title="Editar"]');
        if (exact) return exact;

        const directSelectors = [
            '[title*="Editar" i]',
            '[aria-label*="Editar" i]',
            '[data-original-title*="Editar" i]',
            '[data-action*="edit" i]',
            'button[onclick*="edit" i]',
            'a[onclick*="edit" i]',
            'button[onclick*="modif" i]',
            'a[onclick*="modif" i]'
        ];

        for (const selector of directSelectors) {
            const found = row.querySelector(selector);
            if (found) return found;
        }

        const icon = row.querySelector(
            ".fa-pen-to-square, .fa-edit, .fa-pencil, .fa-pencil-alt"
        );
        if (icon) return icon.closest("button, a, [role='button']") || icon;

        return [...row.querySelectorAll("button, a, [role='button']")].find(element =>
            /\b(edit|editar|modificar)\b/i.test(clean(
                `${element.textContent} ${element.title} ${element.getAttribute("aria-label")}`
            ))
        ) || null;
    }

    function findRoverRow(roverEventId) {
        const id = clean(roverEventId);
        const table = findEventTable();
        if (!id || !table) return null;

        return getCBBRows(table).find(row =>
            clean(row.getAttribute("tkt")) === id ||
            row.id === id ||
            clean(row.dataset.rsSnValue) === id ||
            clean(row.dataset.eventId) === id ||
            clean(row.querySelector("input[evento]")?.getAttribute("evento")) === id ||
            (typeof CSS !== "undefined" && typeof CSS.escape === "function" &&
                row.querySelector(`button[onclick="geEeOpen('${CSS.escape(id)}')"]`))
        ) || null;
    }

    async function waitForCBBView(timeoutMs = 10000) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            if (isCBBView() && findEventTable()) return true;
            await sleep(125);
        }
        return false;
    }

    async function waitForRoverRow(roverEventId, timeoutMs = 10000) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            const row = findRoverRow(roverEventId);
            if (row) return row;
            await sleep(125);
        }
        return null;
    }

    function currentModal() {
        const form = document.querySelector("#ge-ee-form-wrap");
        if (!form || !isVisible(form)) return null;
        // En RoverSport el overlay real usa id="ge-ee-overlay" y no tiene
        // la clase .ge-ee-overlay. El footer con Guardar Cambios es hermano
        // de #ge-ee-body, por lo que form.parentElement no alcanza el botón.
        const scope = form.closest(
            "#ge-ee-overlay, .ge-ee-overlay, .modal.show, [role='dialog'], .modal"
        ) || document.querySelector("#ge-ee-overlay") || form.parentElement || form;
        return { form, scope };
    }


    function modalReadiness(item, modal) {
        if (!modal?.form) return { ready: false, reason: "formulario ausente" };
        const id = clean(modal.form.querySelector("#ge-ee-serial")?.value ||
            modal.form.querySelector('input[name="evento[]"]')?.value);
        const away = clean(modal.form.querySelector("#ge-ee-team1")?.value);
        const home = clean(modal.form.querySelector("#ge-ee-team2")?.value);
        if (id !== item.rover.roverEventId)
            return { ready: false, reason: id ? "otro SN" : "SN pendiente" };
        if (!away || !home)
            return { ready: false, reason: "equipos pendientes" };
        if (away !== item.rover.away.roverCode || home !== item.rover.home.roverCode)
            return { ready: false, reason: "equipos diferentes", mismatch: true };
        const field = findUrlField(modal);
        return field
            ? { ready: true, reason: "listo", field }
            : { ready: false, reason: "URL sin montar" };
    }

    async function openEditor(item) {
        if (currentModal()) throw new Error(
            "Hay otro editor abierto. Ciérralo antes de procesar este evento."
        );
        const row = await waitForRoverRow(item.rover.roverEventId, 5000);
        if (!row) throw new Error("La fila ya no existe");
        item.rover.row = row;
        const button = findEditButton(row);
        if (!button) throw new Error("No encontré el botón Editar");
        row.scrollIntoView({ block: "center", behavior: "auto" });
        button.click();

        const started = Date.now();
        let reason = "modal no visible";
        while (Date.now() - started < 10000) {
            const modal = currentModal();
            if (modal) {
                const status = modalReadiness(item, modal);
                if (status.ready) return modal;
                reason = status.reason;
                if (status.mismatch) throw new Error(
                    "SN " + item.rover.roverEventId + ": equipos distintos en el editor."
                );
            }
            await sleep(100);
        }
        throw new Error(
            "SN " + item.rover.roverEventId + ": editor incompleto (" + reason + ")."
        );
    }

    function validateModalEvent(item, modal) {
        const status = modalReadiness(item, modal);
        if (!status.ready) throw new Error(
            "SN " + item.rover.roverEventId + ": editor no listo (" + status.reason + ")."
        );
    }
    const ESPN_URL_PATTERN = /https?:\/\/[^\s"'<>]*espn\.com\/mens-college-basketball\/game\/_\/gameId\/(\d+)/i;

    // Explicit or accessible label association only; never select an
    // unrelated odds/score field.
    function validUrlControl(field) {
        return Boolean(field && ["INPUT","SELECT","TEXTAREA"].includes(
            String(field.tagName || "").toUpperCase()
        ) && !field.disabled && String(field.type || "").toLowerCase() !== "hidden");
    }
    function resultsUrlLabel(text) {
        const v = clean(text);
        return /(?:event.{0,12})?result(?:s|ados)?.{0,35}(?:url|link|enlace)|(?:url|link|enlace).{0,35}result(?:s|ados)?/i.test(v);
    }
    function findUrlField(modal) {
        if (!modal?.form || !modal?.scope) return null;
        const explicit = modal.form.querySelector("#ge-ee-url") ||
            modal.scope.querySelector("#ge-ee-url");
        if (validUrlControl(explicit)) return explicit;
        const scopes = [modal.form, modal.scope];
        const fields = [...new Set(scopes.flatMap(node =>
            [...(node.querySelectorAll?.("input, select, textarea") || [])]
        ))];
        const named = fields.filter(field => validUrlControl(field) &&
            resultsUrlLabel([
                field.id, field.name, field.placeholder,
                field.getAttribute?.("aria-label"),
                field.getAttribute?.("data-field"),
                [...(field.labels || [])].map(label => label.textContent).join(" ")
            ].join(" ")));
        if (named.length === 1) return named[0];
        if (named.length > 1) return null;
        const labeled = [];
        for (const scope of scopes) {
            for (const label of scope.querySelectorAll?.("label") || []) {
                if (!resultsUrlLabel(label.textContent)) continue;
                const linked = label.control ||
                    (label.htmlFor && fields.find(field => field.id === label.htmlFor)) ||
                    label.querySelector?.("input, select, textarea");
                if (validUrlControl(linked) && !labeled.includes(linked)) labeled.push(linked);
            }
        }
        return labeled.length === 1 ? labeled[0] : null;
    }
    function modalUrlDiagnostic(modal) {
        const fields = [...(modal?.scope?.querySelectorAll?.("input, select, textarea") || [])];
        return "Controles: " + (fields.slice(0,30).map(field =>
            [field.tagName,field.id,field.name,field.placeholder]
                .map(v => clean(v).slice(0,50)).filter(Boolean).join("/")
        ).join("; ") || "ninguno");
    }

    async function waitForUrlField(item, milliseconds = 4500) {
        const since = Date.now();
        let reason = "no hay controles";
        while (Date.now() - since < milliseconds) {
            const modal = currentModal();
            if (modal) {
                const status = modalReadiness(item, modal);
                if (status.ready) return status.field;
                reason = status.reason;
                if (status.mismatch) throw new Error(
                    "SN " + item.rover.roverEventId + ": equipos distintos en el editor."
                );
            } else {
                reason = "modal cerrado durante la espera";
            }
            await sleep(125);
        }
        throw new Error(
            "SN " + item.rover.roverEventId + ": editor no listo (" + reason + ")."
        );
    }
    function readExistingLink(modal, field) {
        const values = [];
        if (field) {
            values.push(field.value);
            if (field.tagName === "SELECT") {
                values.push(field.options[field.selectedIndex]?.textContent);
            }
        }
        // Only the existing "Actual" link is trusted; assistant URLs are not persisted.
        for (const anchor of modal.scope.querySelectorAll("a[href]")) {
            const containerText = clean(anchor.parentElement?.textContent);
            if (/\bactual\b/i.test(containerText)) {
                values.push(anchor.getAttribute("href"), anchor.href, anchor.textContent);
            }
        }
        for (const value of values) {
            const url = clean(value).match(/https?:\/\/[^\s"'<>]+/i)?.[0];
            if (!url) continue;
            const match = url.match(ESPN_URL_PATTERN);
            return { url, eventId: match?.[1] || "" };
        }
        return null;
    }


    // Official ESPN hosts and documented ESPN game-page shapes only.
    // ESPN also publishes /boxscore/_/gameId/... in addition to /game/.
    const ESPN_HOST_PATTERN = /^https?:\/\/(?:(?:www|espndeportes)\.)?espn\.com(?:[/:?#]|$)/i;
    function isTrustedEspnUrl(url) {
        return ESPN_HOST_PATTERN.test(clean(url));
    }
    function espnGameInfo(url) {
        if (!isTrustedEspnUrl(url)) return null;
        const match = clean(url).match(
            /^https?:\/\/(?:(?:www|espndeportes)\.)?espn\.com\/([a-z0-9-]+)\/(game|boxscore|matchup|playbyplay)\/_\/gameId\/(\d+)(?=[/?#]|$)/i
        );
        if (match) return { competition: match[1].toLowerCase(), eventId: match[3] };
        // ESPN's older direct /game?gameId=... URLs are valid game references
        // but only when the league and endpoint are both explicit.
        const legacy = clean(url).match(
            /^https?:\/\/(?:(?:www|espndeportes)\.)?espn\.com\/([a-z0-9-]+)\/game\/?\?[^#\s]*\bgameId=(\d+)(?:[&#]|$)/i
        );
        return legacy ? { competition: legacy[1].toLowerCase(), eventId: legacy[2] } : null;
    }
    function linkDomainPath(url) {
        // Deliberately omit query and fragment; these may contain user tokens.
        const found = clean(url).match(/^https?:\/\/([^/?#\s]+)(\/[^?#\s]*)?/i);
        if (!found) return "URL no reconocible";
        return (found[1].toLowerCase() + (found[2] || "/")).slice(0, 180);
    }
    function strictEspnId(url) {
        const info = espnGameInfo(url);
        return info?.competition === "mens-college-basketball" ? info.eventId : "";
    }
    function classifyLink(item, current) {
        if (!current?.url) return "EMPTY";
        const info = espnGameInfo(current.url);
        if (!info) return isTrustedEspnUrl(current.url) ? "OTHER_ESPN_FORMAT" : "OTHER_LINK";
        // An ESPN women's basketball link is never a valid men's basketball
        // link, even when its numeric gameId accidentally matches.
        if (info.competition !== "mens-college-basketball") return "WRONG_COMPETITION";
        if (item.status !== "READY" || !item.match?.eventId) return "NEEDS_REVIEW";
        return info.eventId === String(item.match.eventId) ? "CORRECT" : "WRONG_ESPN";
    }
    function isCorrectableAudit(report) {
        return Boolean(report && ["WRONG_ESPN", "WRONG_COMPETITION"].includes(report.status) &&
            report.item?.status === "READY" && report.item.match?.eventId &&
            report.existingId && report.existingCompetition);
    }
    function inspectLink(modal) {
        const field = findUrlField(modal);
        const current = readExistingLink(modal, field);
        const fieldUrl = clean(field?.value).match(/^https?:\/\/\S+/)?.[0] || "";
        const actual = [...modal.scope.querySelectorAll("a[href]")].find(a => /\bactual\b/i.test(clean(a.parentElement?.textContent)));
        const actualUrl = clean(actual?.getAttribute("href") || actual?.href);
        return { field, current, conflict: Boolean(fieldUrl && actualUrl && fieldUrl !== actualUrl) };
    }
    function auditTotals() {
        return state.linkAudit.reduce((sum, r) => {
            sum[r.status] = (sum[r.status] || 0) + 1;
            return sum;
        }, {});
    }
    function renderAudit() {
        const panel = document.getElementById(PANEL_ID);
        const label = panel?.querySelector('[data-role="audit-summary"]');
        const details = panel?.querySelector('[data-role="audit-details"]');
        const list = panel?.querySelector('[data-role="audit-list"]');
        if (!label || !details || !list) return;
        const c = auditTotals();
        const review = (c.OTHER_LINK || 0) + (c.OTHER_ESPN_FORMAT || 0) +
            (c.NEEDS_REVIEW || 0) + (c.CONFLICT || 0) + (c.ERROR || 0);
        const wrong = (c.WRONG_ESPN || 0) + (c.WRONG_COMPETITION || 0);
        label.textContent = state.linkAudit.length ?
            `Links: ${c.CORRECT || 0} correctos · ${wrong} incorrectos (${c.WRONG_COMPETITION || 0} de otra competición) · ${c.CORRECTED || 0} corregidos · ${c.EMPTY || 0} vacíos · ${review} revisión` : "";
        const items = state.linkAudit.filter(r => !["CORRECT", "EMPTY"].includes(r.status));
        details.hidden = items.length === 0;
        details.open = items.length > 0;
        details.querySelector("summary").textContent = `Auditoría de links (${items.length})`;
        list.replaceChildren();
        for (const r of items) {
            const line = document.createElement("div");
            line.className = "cbbll-review-item";
            const competition = r.existingCompetition === "womens-college-basketball" ?
                " · ESPN femenino" : (r.existingCompetition && r.existingCompetition !== "mens-college-basketball" ?
                    ` · ESPN ${r.existingCompetition}` : "");
            const source = ["OTHER_LINK", "OTHER_ESPN_FORMAT"].includes(r.status) ?
                ` · origen: ${linkDomainPath(r.existingUrl)}` : "";
            line.textContent = `SN ${r.item.rover.roverEventId} · ${r.status}${competition} · ESPN anterior #${r.existingId || "?"} · esperado #${r.item.match?.eventId || "sin validar"}${source}` +
                (r.error ? ` · ${r.error}` : "");
            list.appendChild(line);
        }
    }
    function notifyCorrection(item, oldId, newId, oldCompetition = "mens-college-basketball") {
        const origin = oldCompetition === "womens-college-basketball" ?
            "ESPN femenino" : (oldCompetition === "mens-college-basketball" ? "ESPN" : `ESPN ${oldCompetition}`);
        const text = `SN ${item.rover.roverEventId}: ${origin} #${oldId} → ESPN masculino #${newId}`;
        log(`Enlace corregido y comprobado: ${text}`);
        try {
            if (typeof GM_notification === "function") {
                GM_notification({ title: "CBB LLoader: enlace corregido", text, timeout: 10000,
                    tag: `cbb-correction-${item.rover.roverEventId}` });
            }
        } catch (error) { console.warn(TAG, "Error mostrando notificación:", error); }
    }

    function setNativeValue(element, value) {
        const prototype = element.tagName === "SELECT"
            ? HTMLSelectElement.prototype
            : element.tagName === "TEXTAREA"
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (setter) setter.call(element, value);
        else element.value = value;
    }

    function writeUrlField(field, url) {
        if (!field) throw new Error("No encontré EVENT RESULTS URL");

        if (field.tagName === "SELECT") {
            let option = [...field.options].find(candidate =>
                clean(candidate.value) === url || clean(candidate.textContent) === url
            );
            if (!option) {
                option = new Option(url, url, true, true);
                option.dataset.cbbLloader = "added";
                field.add(option);
            }
        }

        setNativeValue(field, url);
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));

        try {
            const jq = window.jQuery;
            if (jq) jq(field).val(url).trigger("input").trigger("change");
        } catch (_) {}

        if (clean(field.value) !== url) {
            throw new Error("El campo URL rechazó el enlace");
        }
    }

    function findModalButton(modal, pattern) {
        return [...modal.scope.querySelectorAll("button, input[type='button'], input[type='submit'], a")]
            .filter(isVisible)
            .find(element => pattern.test(clean(
                `${element.textContent} ${element.value} ${element.title} ${element.getAttribute("aria-label")}`
            ))) || null;
    }

    async function closeModal(modal) {
        if (!currentModal()) return;
        const button = findModalButton(modal, /\b(cancelar|cerrar|close)\b/i) ||
            modal.scope.querySelector(".btn-close, .close, [data-dismiss='modal']");
        if (button) button.click();

        const started = Date.now();
        while (currentModal() && Date.now() - started < 3000) await sleep(100);
    }

    function persistedEventId(modal) {
        for (const anchor of modal.scope.querySelectorAll("a[href]")) {
            const containerText = clean(anchor.parentElement?.textContent);
            const match = clean(anchor.getAttribute("href") || anchor.href).match(ESPN_URL_PATTERN);
            if (match && /\bactual\b/i.test(containerText)) return match[1];
        }
        return "";
    }


    async function saveModal(item, modal) {
        validateModalEvent(item, modal);
        const button = modal.scope.querySelector("#ge-ee-save-btn") ||
            document.querySelector("#ge-ee-save-btn") ||
            findModalButton(modal, /guardar\s+cambios/i) ||
            findModalButton(modal, /^\s*guardar\s*$/i);
        if (!button) throw new Error("No encontré Guardar Cambios");

        const beforeBox = modal.scope.querySelector("#ge-ee-msg.ok");
        const before = beforeBox && isVisible(beforeBox) ? clean(beforeBox.textContent) : "";
        const toastSelector = ".toast, .alert, .swal2-popup, [role='alert']";
        const previousToasts = new Map([...document.querySelectorAll(toastSelector)]
            .map(element => [element, clean(element.textContent)]));
        button.click();
        const start = Date.now();
        let sawConfirmation = false;
        while (Date.now() - start < 12000) {
            const active = currentModal();
            if (!active) return { ui: "closed" };
            const errorBox = active.scope.querySelector("#ge-ee-msg.err");
            if (errorBox && isVisible(errorBox))
                throw new Error(clean(errorBox.textContent) || "Rover rechazó el guardado");

            const okBox = active.scope.querySelector("#ge-ee-msg.ok");
            const message = okBox && isVisible(okBox) ? clean(okBox.textContent) : "";
            const explicit = message && message !== before &&
                /guardad|actualizad|correct|success|éxito|exito|saved/i.test(message);
            const toast = [...document.querySelectorAll(toastSelector)]
                .some(el => isVisible(el) &&
                    /guardad|actualizad|success|éxito/i.test(el.textContent) &&
                    (!previousToasts.has(el) ||
                        previousToasts.get(el) !== clean(el.textContent)));
            if (explicit || toast) {
                sawConfirmation = true;
                break;
            }
            await sleep(125);
        }
        // A missing toast is NOT a failed save. Close without resubmitting
        // and verify persisted gameId in a freshly reopened editor.
        const active = currentModal();
        if (active) {
            await closeModal(active);
            if (currentModal()) throw new Error(
                "Editor aún abierto tras guardar; resultado incierto, sin reintento."
            );
        }
        return { ui: sawConfirmation ? "confirmed" : "unknown" };
    }
    async function waitForTableRefresh(previousTable, previousRow, timeoutMs = 10000) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            const current = findEventTable();
            const panelWrap = document.getElementById("ge-panel-wrap");
            const interactive = panelWrap?.style.pointerEvents !== "none";
            if (current && interactive && isCBBView() && !currentModal()) {
                // Rover might replace the full table, only the tbody, or just tr's.
                // The fallback permits same-node updates; persistence is independently
                // verified by reopening the saved event.
                const changed = current !== previousTable ||
                    (previousRow && previousRow.isConnected === false);
                if (changed || Date.now() - started >= 1800) return true;
            }
            await sleep(125);
        }
        return false;
    }

    function isPlanContextSafe(item = null, liveRow = null) {
        if (!isCBBView() || !state.planSignature || !state.plan.length) return false;
        // Selected date is a global guard. Per-row identity must be verified
        // separately because Rover rebuilds, filters and reorders the table.
        if (state.planSelectedDate !== getGlobalIsoDate()) return false;
        if (!item) return true;
        const row = liveRow || findRoverRow(item.rover.roverEventId);
        const current = row ? parseRoverRow(row) : null;
        if (!current) return false;
        const before = item.rover;
        return current.roverEventId === before.roverEventId &&
            current.date === before.date &&
            current.timeMinutes === before.timeMinutes &&
            current.away.roverCode === before.away.roverCode &&
            current.home.roverCode === before.home.roverCode;
    }

    async function verifySavedUrl(item) {
        const liveRow = await waitForRoverRow(item.rover.roverEventId, 5000);
        if (!liveRow) throw new Error("No pude reabrir el evento para confirmar el enlace guardado");
        item.rover.row = liveRow;
        let modal = null;
        try {
            modal = await openEditor(item);
            await sleep(180);
            modal = currentModal() || modal;
            validateModalEvent(item, modal);
            const savedField = await waitForUrlField(item, 2600);
            modal = currentModal() || modal;
            const saved = readExistingLink(modal, savedField);
            if (strictEspnId(saved?.url) !== String(item.match.eventId))
                throw new Error("Rover no conservó el enlace esperado tras guardar");
        } finally {
            if (modal) await closeModal(modal);
        }
        if (currentModal()) throw new Error("El editor no se cerró tras confirmar el guardado");
    }

    async function processItem(item) {
        const tableBeforeSave = findEventTable();
        let modal = await openEditor(item);
        const rowBeforeSave = item.rover.row;

        try {
            // Da tiempo a los componentes dinámicos de Rover y a otros helpers
            // para terminar de montar el formulario antes de escribir.
            await sleep(180);
            modal = currentModal() || modal;
            validateModalEvent(item, modal);
            let field = await waitForUrlField(item);
            modal = currentModal() || modal;
            const existing = readExistingLink(modal, field);

            if (existing?.eventId === item.match.eventId) {
                await closeModal(modal);
                return "ALREADY_LINKED";
            }

            if (existing) {
                throw new Error(
                    `Ya existe un enlace (${existing.url}); no se reemplazó por ESPN #${item.match.eventId}`
                );
            }

            writeUrlField(field, item.url);

            // Revalida justo antes de guardar: otro userscript podría haber
            // reemplazado el control o cambiado su valor mientras se abría.
            await sleep(120);
            modal = currentModal() || modal;
            validateModalEvent(item, modal);
            field = await waitForUrlField(item, 1400);
            const pendingId = clean(field?.value).match(ESPN_URL_PATTERN)?.[1] || "";
            if (pendingId !== item.match.eventId) {
                throw new Error(
                    `El campo cambió antes de guardar; esperaba ESPN #${item.match.eventId}`
                );
            }

            await saveModal(item, modal);

            if (!(await waitForTableRefresh(tableBeforeSave, rowBeforeSave, 3500))) {
                log("SN " + item.rover.roverEventId +
                    ": recarga no detectada; verificando URL persistida.", "warn");
            }
            await verifySavedUrl(item);
            return "SAVED";
        } catch (error) {
            await closeModal(modal);
            throw error;
        }
    }


    function requireAuditedTable() {
        if (!isCBBView() || !state.planSignature || currentPlanSignature() !== state.planSignature) {
            throw new Error("La tabla, fecha, hora o equipos cambiaron. Pulsa Analizar de nuevo.");
        }
    }
    async function verifyExistingLinks() {
        if (["analyzing", "loading", "auditing", "correcting"].includes(state.phase)) {
            throw new Error("Ya existe un proceso CBB activo.");
        }
        state.scoreboardCache.clear();
        state.scheduleCache.clear();
        await analyze();
        requireAuditedTable();
        state.phase = "auditing";
        state.auditSignature = "";
        state.linkAudit = [];
        state.stopRequested = false;
        updateButtons();
        setProgress(0, state.plan.length);
        let completed = false;
        try {
            for (const item of state.plan) {
                if (state.stopRequested) break;
                requireAuditedTable();
                let modal = null;
                const result = { item, status: "ERROR", existingUrl: "", existingId: "", existingCompetition: "", error: "" };
                try {
                    modal = await openEditor(item);
                    await sleep(180);
                    modal = currentModal() || modal;
                    validateModalEvent(item, modal);
                    const data = inspectLink(modal);
                    result.existingUrl = data.current?.url || "";
                    const oldInfo = espnGameInfo(result.existingUrl);
                    result.existingId = oldInfo?.eventId || "";
                    result.existingCompetition = oldInfo?.competition || "";
                    result.status = data.conflict ? "CONFLICT" : classifyLink(item, data.current);
                    if (isCorrectableAudit(result))
                        log(`SN ${item.rover.roverEventId}: enlace ESPN ${result.existingCompetition} #${result.existingId} incorrecto; corresponde ESPN masculino #${item.match.eventId}`, "warn");
                    else if (result.status === "WRONG_COMPETITION")
                        log(`SN ${item.rover.roverEventId}: enlace femenino #${result.existingId} detectado, pero el partido masculino no tiene coincidencia exacta; revisión manual.`, "warn");
                } catch (error) {
                    result.error = clean(error?.message || error);
                    log(`Auditoría SN ${item.rover.roverEventId}: ${result.error}`, "error");
                } finally {
                    if (modal) await closeModal(modal);
                }
                state.linkAudit.push(result);
                setProgress(state.linkAudit.length, state.plan.length);
                if (currentModal()) throw new Error("No se pudo cerrar el editor; auditoría detenida.");
                await sleep(75);
            }
            completed = !state.stopRequested && state.linkAudit.length === state.plan.length;
            if (completed) state.auditSignature = state.planSignature;
            const totals = auditTotals();
            log(`Verificación: ${totals.CORRECT || 0} correctos, ${(totals.WRONG_ESPN || 0) + (totals.WRONG_COMPETITION || 0)} incorrectos (${totals.WRONG_COMPETITION || 0} de otra competición), ${totals.EMPTY || 0} vacíos.`);
            return state.linkAudit;
        } finally {
            if (!completed) state.auditSignature = "";
            state.phase = "ready";
            renderAudit();
            updateButtons();
        }
    }
    async function correctExistingLinks() {
        requireSingleLoader();
        if (["analyzing", "loading", "auditing", "correcting"].includes(state.phase))
            throw new Error("Ya existe un proceso CBB activo");
        requireAuditedTable();
        if (!state.auditSignature || state.auditSignature !== state.planSignature)
            throw new Error("Primero pulsa Verificar enlaces y completa la auditoría.");
        const wrong = state.linkAudit.filter(isCorrectableAudit);
        if (!wrong.length) { log("No hay enlaces ESPN incorrectos para corregir."); return state.linkAudit; }
        state.phase = "correcting";
        state.stopRequested = false;
        updateButtons();
        setProgress(0, wrong.length);
        try {
            for (let idx = 0; idx < wrong.length; idx++) {
                if (state.stopRequested) break;
                requireAuditedTable();
                const r = wrong[idx], item = r.item, oldId = r.existingId,
                    oldCompetition = r.existingCompetition;
                let modal = null;
                try {
                    modal = await openEditor(item);
                    await sleep(180);
                    modal = currentModal() || modal;
                    validateModalEvent(item, modal);
                    const old = inspectLink(modal);
                    const stillExisting = espnGameInfo(old.current?.url);
                    if (old.conflict || !old.field || !old.current ||
                        stillExisting?.eventId !== r.existingId ||
                        stillExisting?.competition !== r.existingCompetition ||
                        clean(old.current.url) !== clean(r.existingUrl))
                        throw new Error("Enlace cambiado desde auditoría; no se reemplazó.");
                    writeUrlField(old.field, item.url);
                    await sleep(120);
                    modal = currentModal() || modal;
                    validateModalEvent(item, modal);
                    if (strictEspnId(findUrlField(modal)?.value) !== String(item.match.eventId))
                        throw new Error("El control de URL cambió antes de guardar.");
                    await saveModal(item, modal);
                    if (currentModal()) throw new Error("El editor no se cerró tras guardar");
                    await sleep(250);
                    requireAuditedTable();
                    modal = await openEditor(item);
                    await sleep(180);
                    modal = currentModal() || modal;
                    validateModalEvent(item, modal);
                    const confirmed = inspectLink(modal);
                    if (confirmed.conflict || strictEspnId(confirmed.current?.url) !== String(item.match.eventId))
                        throw new Error("No se pudo confirmar el link persistido después de reabrir.");
                    r.status = "CORRECTED";
                    r.existingId = String(item.match.eventId);
                    r.existingUrl = confirmed.current.url;
                    r.existingCompetition = "mens-college-basketball";
                    notifyCorrection(item, oldId, r.existingId, oldCompetition);
                } catch (error) {
                    r.status = "ERROR";
                    r.error = clean(error?.message || error);
                    log(`SN ${item.rover.roverEventId}: ${r.error}`, "error");
                } finally {
                    if (modal) await closeModal(modal);
                }
                setProgress(idx + 1, wrong.length);
                renderAudit();
                if (currentModal()) throw new Error("Editor abierto; deteniendo por seguridad");
                await sleep(125);
            }
            const c = auditTotals();
            log(`Enlaces reparados y comprobados: ${c.CORRECTED || 0}.`);
            return state.linkAudit;
        } finally {
            state.phase = "ready";
            renderAudit();
            updateButtons();
        }
    }

    async function loadLinks({ limit = Infinity } = {}) {
        requireSingleLoader();
        if (["analyzing", "loading", "auditing", "correcting"].includes(state.phase)) return state.plan;
        if (!state.plan.some(item => item.status === "READY")) await analyze();

        if (!isCBBView() || !state.planSignature || currentPlanSignature() !== state.planSignature) {
            state.phase = "idle";
            updateButtons();
            throw new Error("La tabla, fecha, equipos u horarios cambiaron. Presiona Analizar de nuevo.");
        }
        const ready = state.plan
            .filter(item =>
                item.status === "READY" &&
                !["SAVED", "ALREADY_LINKED"].includes(item.loadStatus)
            )
            .slice(0, Number.isFinite(limit) ? Math.max(0, limit) : undefined);
        if (!ready.length) throw new Error("No hay coincidencias exactas para cargar");

        state.phase = "loading";
        state.stopRequested = false;
        updateButtons();
        setProgress(0, ready.length);
        log(`Iniciando carga controlada de ${ready.length} enlaces…`);

        for (let index = 0; index < ready.length; index += 1) {
            const item = ready[index];

            if (state.stopRequested) {
                log(`Proceso detenido en ${index}/${ready.length}.`, "warn");
                break;
            }
            if (!(await waitForCBBView())) {
                item.loadStatus = "ERROR";
                item.error = "La tabla CBB no reapareció después de recargar";
                log(item.error, "error");
                break;
            }

            if (!isPlanContextSafe()) {
                item.loadStatus = "ERROR";
                item.error = "Cambió la liga o fecha seleccionada; es necesario volver a analizar antes de guardar.";
                log(item.error, "error");
                log("Carga interrumpida por cambio de liga/fecha. Los restantes siguen pendientes.", "warn");
                break;
            }
            const liveRow = await waitForRoverRow(item.rover.roverEventId, 3200);
            if (!liveRow) {
                item.loadStatus = "SKIPPED";
                item.error = `SN ${item.rover.roverEventId}: no visible después de recargar (sin modificar).`;
                log(item.error, "warn");
                setProgress(index + 1, ready.length);
                continue;
            }
            if (!isPlanContextSafe()) {
                item.loadStatus = "ERROR";
                item.error = "Cambió la liga o fecha mientras esperaba el evento; vuelve a analizar.";
                log(item.error, "error");
                break;
            }
            // Do not require every old row to remain. Check exact identity
            // of the current event before opening its editor.
            if (!isPlanContextSafe(item, liveRow)) {
                item.loadStatus = "SKIPPED";
                item.error = `SN ${item.rover.roverEventId}: equipos, hora o fecha de la fila cambiaron; omitido sin escribir.`;
                log(item.error, "warn");
                setProgress(index + 1, ready.length);
                continue;
            }
            item.rover.row = liveRow;
            log(
                `${index + 1}/${ready.length} · #${item.rover.roverEventId} · ` +
                `${item.rover.away.roverName} @ ${item.rover.home.roverName}`
            );

            try {
                item.loadStatus = await processItem(item);
                item.error = "";
            } catch (error) {
                item.loadStatus = "ERROR";
                item.error = clean(error?.message || error);
                log(`#${item.rover.roverEventId}: ${item.error}`, "error");
                if (currentModal()) {
                    log("Editor todavía abierto tras un error: carga interrumpida para evitar escrituras inseguras.", "error");
                    setProgress(index + 1, ready.length);
                    break;
                }
            }

            setProgress(index + 1, ready.length);
            await sleep(350);
        }

        state.phase = "ready";
        state.stopRequested = false;
        updateButtons();

        const saved = ready.filter(item => item.loadStatus === "SAVED").length;
        const existing = ready.filter(item => item.loadStatus === "ALREADY_LINKED").length;
        const errors = ready.filter(item => item.loadStatus === "ERROR").length;
        const skipped = ready.filter(item => item.loadStatus === "SKIPPED").length;
        const remaining = ready.filter(item => !item.loadStatus).length;
        log(`Finalizado: ${saved} guardados, ${existing} ya vinculados, ${skipped} omitidos, ${errors} errores, ${remaining} pendientes.`);
        console.table(ready.map(item => ({
            ROVER_EVENT_ID: item.rover.roverEventId,
            ESPN_EVENT_ID: item.match.eventId,
            RESULTADO: item.loadStatus || "NO_PROCESADO",
            ERROR: item.error || ""
        })));
        return state.plan;
    }

    function stop() {
        state.stopRequested = true;
        log("Detención solicitada; terminaré el evento actual.", "warn");
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            /* Old scripts may re-show their panel every second. Hide it but
               retain a warning and block writes until it is disabled. */
            #${LEGACY_PANEL_ID}, #${LEGACY_LAUNCHER_ID} { display:none !important; }
            #${PANEL_ID} {
                position: fixed; right: 16px; top: 74px; z-index: 2147483000;
                width: 330px; box-sizing: border-box; padding: 12px;
                color: #17233c; background: #fff; border: 1px solid #b9c9e6;
                border-radius: 10px; box-shadow: 0 10px 30px rgba(15,35,70,.22);
                font: 600 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;
            }
            #${PANEL_ID}[hidden] { display: none !important; }
            #${PANEL_ID} .cbbll-legacy-warning { margin:6px 0; padding:7px; border-radius:6px; background:#fef3c7; color:#92400e; font-size:11px; font-weight:700; }
            #${PANEL_ID} .cbbll-title { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-size:14px; font-weight:800; }
            #${PANEL_ID} .cbbll-version { color:#64748b; font-size:11px; font-weight:600; }
            #${PANEL_ID} .cbbll-actions { display:flex; gap:6px; }
            #${PANEL_ID} button { border:0; border-radius:7px; padding:8px 10px; cursor:pointer; font:700 12px system-ui,sans-serif; }
            #${PANEL_ID} button:disabled { opacity:.45; cursor:not-allowed; }
            #${PANEL_ID} [data-action="analyze"] { color:#fff; background:#0e7490; }
            #${PANEL_ID} [data-action="test"] { color:#1e3a8a; background:#dbeafe; }
            #${PANEL_ID} [data-action="load"] { flex:1; color:#fff; background:#2563eb; }
            #${PANEL_ID} [data-action="stop"] { color:#fff; background:#dc2626; }
            #${PANEL_ID} .cbbll-audit-actions { display:flex; gap:6px; margin-top:7px; }
            #${PANEL_ID} .cbbll-audit-actions button { flex:1; }
            #${PANEL_ID} [data-action="audit"] { background:#ccfbf1; color:#0f766e; }
            #${PANEL_ID} [data-action="fix"] { background:#b45309; color:white; }
            #${PANEL_ID} .cbbll-audit-summary { margin-top:5px; font-size:11px; font-weight:700; color:#92400e; }
            #${PANEL_ID} .cbbll-progress { height:7px; margin:9px 0 6px; overflow:hidden; background:#e7edf7; border-radius:10px; }
            #${PANEL_ID} .cbbll-progress > i { display:block; width:0; height:100%; background:#22c55e; transition:width .15s ease; }
            #${PANEL_ID} .cbbll-status { display:flex; justify-content:space-between; gap:8px; color:#475569; font-size:11px; }
            #${PANEL_ID} .cbbll-result-summary { margin-top:7px; color:#1e3a8a; font-size:11px; font-weight:750; line-height:1.5; white-space:normal; }
            #${PANEL_ID} [data-role="last"] { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            #${PANEL_ID} .cbbll-review { margin-top:8px; border-top:1px solid #dbe3f0; padding-top:7px; }
            #${PANEL_ID} .cbbll-review > summary { cursor:pointer; color:#b45309; font-size:11px; font-weight:800; }
            #${PANEL_ID} .cbbll-review-list { max-height:190px; margin-top:6px; overflow:auto; }
            #${PANEL_ID} .cbbll-review-item { padding:6px 7px; margin-top:5px; background:#fff7ed; border-left:3px solid #f59e0b; border-radius:5px; }
            #${PANEL_ID} .cbbll-review-matchup { color:#17233c; font-size:11px; font-weight:800; }
            #${PANEL_ID} .cbbll-review-reason { margin-top:2px; color:#9a3412; font-size:10px; font-weight:600; }
            #${LAUNCHER_ID} { margin-left:6px; }
        `;
        document.head.appendChild(style);
    }

    function ensureLauncher() {
        let launcher = document.getElementById(LAUNCHER_ID);
        if (launcher) { launcher.title = `Abrir CBB LLoader v${VERSION}`; return launcher; }

        const sportHead = [...document.querySelectorAll(".ge-sport-head")].find(head =>
            /(?:BALONCESTO|BASKETBALL)/i.test(clean(head.querySelector("h4")?.textContent))
        );
        const actions = sportHead?.querySelector(".ge-sport-actions");
        if (!actions) return null;

        launcher = document.createElement("button");
        launcher.id = LAUNCHER_ID;
        launcher.type = "button";
        launcher.className = "btn btn-warning btn-sm";
        launcher.textContent = "🏀 CBB LLoader";
        launcher.title = `Abrir CBB LLoader v${VERSION}`;
        launcher.addEventListener("click", () => {
            const panel = ensurePanel();
            panel.hidden = false;
        });
        actions.appendChild(launcher);
        return launcher;
    }

    function ensurePanel() {
        installStyles();
        let panel = document.getElementById(PANEL_ID);
        const created = !panel;

        if (!panel) {
            panel = document.createElement("section");
            panel.id = PANEL_ID;
            panel.innerHTML = `
                <div class="cbbll-title">
                    <span>🏀 CBB LLoader</span>
                    <span class="cbbll-version">v${VERSION}</span>
                </div>
                <div class="cbbll-legacy-warning" data-role="legacy-warning" hidden></div>
                <div class="cbbll-actions">
                    <button type="button" data-action="analyze">Analizar</button>
                    <button type="button" data-action="test" disabled>Probar 1</button>
                    <button type="button" data-action="load" disabled>Cargar enlaces</button>
                    <button type="button" data-action="stop" hidden>Detener</button>
                </div>
                <div class="cbbll-audit-actions"><button type="button" data-action="audit">Verificar enlaces</button><button type="button" data-action="fix" disabled>Corregir incorrectos</button></div>
                <div class="cbbll-progress"><i data-role="bar"></i></div>
                <div class="cbbll-status">
                    <span data-role="last">Listo para analizar.</span>
                    <span data-role="count">0/0</span>
                </div>
                <div class="cbbll-result-summary" data-role="summary" aria-live="polite"></div>
                <div class="cbbll-audit-summary" data-role="audit-summary" aria-live="polite"></div>
                <details class="cbbll-review" data-role="audit-details" hidden><summary>Links por revisar</summary><div class="cbbll-review-list" data-role="audit-list"></div></details>
                <details class="cbbll-review" data-role="review-details" hidden>
                    <summary data-role="review-title">⚠ Requieren revisión (0)</summary>
                    <div class="cbbll-review-list" data-role="review-list"></div>
                </details>
            `;
            panel.addEventListener("click", event => {
                const button = event.target.closest("button[data-action]");
                if (!button) return;

                if (button.dataset.action === "analyze") {
                    analyze().catch(error => {
                        state.phase = "idle";
                        updateButtons();
                        log(clean(error?.message || error), "error");
                    });
                } else if (button.dataset.action === "test") {
                    loadLinks({ limit: 1 }).catch(error => {
                        state.phase = "ready";
                        updateButtons();
                        log(clean(error?.message || error), "error");
                    });
                } else if (button.dataset.action === "load") {
                    loadLinks().catch(error => {
                        state.phase = "ready";
                        updateButtons();
                        log(clean(error?.message || error), "error");
                    });
                } else if (button.dataset.action === "audit") {
                    verifyExistingLinks().catch(e => log(clean(e?.message || e), "error"));
                } else if (button.dataset.action === "fix") {
                    correctExistingLinks().catch(e => log(clean(e?.message || e), "error"));
                } else if (button.dataset.action === "stop") {
                    stop();
                }
            });
            document.body.appendChild(panel);
        }

        // Version label must be in sync even when an existing node is reused.
        const versionLabel = panel.querySelector(".cbbll-version");
        if (versionLabel) versionLabel.textContent = `v${VERSION}`;
        const legacyDetected = hasLegacyCollision();
        const warning = panel.querySelector('[data-role="legacy-warning"]');
        if (warning) {
            warning.hidden = !legacyDetected;
            if (legacyDetected) warning.textContent =
                "Conflicto: otra versión de CBB LLoader está activa. Desactívala en Tampermonkey y recarga. Las escrituras están bloqueadas.";
        }
        const active = isCBBView();
        const last = panel.querySelector('[data-role="last"]');

        // El panel permanece visible para que un fallo de detección sea
        // observable. Solo se desactivan sus acciones fuera de CBB.
        if (state.viewActive !== active && state.phase === "idle") {
            if (last) {
                last.textContent = active
                    ? "Tabla CBB detectada. Listo para analizar."
                    : "Script activo · buscando la tabla CBB…";
            }
            state.viewActive = active;
        }
        panel.hidden = false;
        ensureLauncher();
        // In the READY phase the previously verified plan owns the button state.
        // The one-second panel heartbeat must not toggle enabled/disabled because
        // Rover temporarily swaps select elements and grouped rows during redraws.
        // loadLinks() still revalidates the complete context before every write.
        if (created || state.phase !== "ready" || state.legacyCollision !== legacyDetected) updateButtons();
        state.legacyCollision = legacyDetected;
        return panel;
    }

    const API = {
        version: VERSION,
        analyze,
        load: loadLinks,
        stop,
        verifyLinks: verifyExistingLinks,
        correctLinks: correctExistingLinks,
        getLinkAudit: () => state.linkAudit.map(r => ({ roverEventId: r.item.rover.roverEventId, status: r.status,
            existingId: r.existingId, existingCompetition: r.existingCompetition || "",
            existingSource: linkDomainPath(r.existingUrl),
            expectedId: r.item.match?.eventId || "", correctable: isCorrectableAudit(r), error: r.error })),
        getUnrecognizedLinks: () => state.linkAudit.filter(r =>
            ["OTHER_LINK", "OTHER_ESPN_FORMAT"].includes(r.status)
        ).map(r => ({
            SN: r.item.rover.roverEventId, estado: r.status,
            origen: linkDomainPath(r.existingUrl),
            ESPN_esperado: r.item.match?.eventId || "sin validar"
        })),
        getPlan: () => state.plan,
        getSummary: planSummary,
        getLog: () => [...state.log],
        diagnoseModal: () => { const m = currentModal(); return m ?
            modalUrlDiagnostic(m) : "No hay editor abierto"; },
        uiDiagnostics,
        getRoverEvents,
        isCBBView,
        qa: Object.freeze({
            teamIds: Object.freeze(TEAM_IDS),
            parseEspnEvent,
            parseRoverRow,
            findExact,
            dateTimeInZone,
            basketballSeasonYear,
            currentPlanSignature,
            readExistingLink,
            findUrlField,
            modalReadiness,
            modalUrlDiagnostic,
            resultsUrlLabel,
            strictEspnId,
            espnGameInfo,
            isTrustedEspnUrl,
            linkDomainPath,
            classifyLink,
            isCorrectableAudit,
            getCBBRows,
            findRoverRow,
            isPlanContextSafe,
            waitForTableRefresh,
            isCollegeBasketballLeague,
            isBasketballCategory
        }),
        clearCache() {
            state.scoreboardCache.clear();
            state.scheduleCache.clear();
        }
    };

    expose("__CBB_LLOADER", API);
    ensurePanel();
    panelPollId = setInterval(() => {
        if (runtime.active) ensurePanel();
    }, 1000);
    console.log(`${TAG} v${VERSION} cargado. Dataset: ${Object.keys(TEAM_IDS).length} equipos.`);
})();
