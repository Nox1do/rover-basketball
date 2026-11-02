// ==UserScript==
// @name         Rs - ESPN CBB LLoader
// @namespace    https://roversport.net/
// @version     0.1.3
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
// @updateURL   https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB/dist/Rs-ESPN-CBB-LLoader.user.js
// @downloadURL https://raw.githubusercontent.com/Nox1do/rover-basketball/main/CBB/dist/Rs-ESPN-CBB-LLoader.user.js
// ==/UserScript==

(() => {
    "use strict";

    const VERSION = "0.1.3";
    // Rover usa America/New_York, independientemente de la zona horaria del equipo.
    const ROVER_TIME_ZONE = "America/New_York";
    const TAG = "[CBB LLoader]";
    const PANEL_ID = "cbb-lloader-panel";
    const STYLE_ID = "cbb-lloader-style";
    const LAUNCHER_ID = "cbb-lloader-launcher";
    const ESPN_GAME_URL = id =>
        `https://www.espn.com/mens-college-basketball/game/_/gameId/${id}`;

    // Mapeo CBB 2026-27: 238 identificadores verificados contra ESPN.
    // No mezclar con los IDs Rover usados en CFB: son deportes distintos.
    const TEAM_IDS = {"733":"2511","711":"2737","872":"2634","870":"93","980":"94","767":"2638","928":"2636","976":"23","638":"2378","746":"2244","919":"2377","765":"5","646":"2390","893":"57","933":"2473","715":"130","963":"2492","795":"172","812":"189","747":"2247","804":"2352","680":"46","886":"349","642":"150","857":"2405","689":"2599","854":"2115","997":"218","709":"2427","671":"257","663":"2429","839":"282","635":"311","685":"2507","981":"322","775":"2086","858":"116","676":"2752","784":"2754","673":"179","822":"2711","752":"295","808":"2520","684":"221","815":"193","749":"256","661":"2908","756":"151","887":"2083","645":"120","285":"2441","690":"183","819":"2199","703":"324","636":"160","793":"225","770":"2885","664":"2168","759":"235","725":"66","702":"2127","688":"58","813":"2084","758":"276","817":"2050","915":"290","944":"2296","734":"2641","796":"159","806":"2368","388":"91","898":"238","910":"2717","648":"153","639":"261","803":"314","885":"44","677":"2132","400":"526","766":"2116","866":"2197","713":"84","908":"2210","794":"171","751":"111","633":"104","662":"56","641":"228","807":"315","692":"277","828":"47","800":"43","955":"2031","754":"2670","669":"113","954":"2653","856":"112358","951":"2226","859":"2514","716":"127","844":"2005","783":"2750","176":"2900","707":"2506","382":"2385","682":"269","873":"2635","904":"344","270":"2330","729":"158","721":"2509","961":"2250","957":"2172","722":"275","818":"2117","960":"2433","892":"2426","667":"45","787":"2428","894":"61","814":"2309","973":"2348","801":"2099","720":"213","810":"2612","687":"2550","179":"88","652":"2057","869":"2413","949":"98","653":"2097","647":"152","658":"288","254":"2546","829":"2379","651":"154","937":"140","835":"156","381":"2698","679":"305","666":"2230","726":"2305","811":"2006","959":"309","300":"2837","730":"201","891":"2329","674":"139","823":"2065","914":"231","809":"2561","853":"2803","855":"161","712":"356","821":"2649","956":"2032","874":"2630","763":"2655","632":"2066","718":"77","938":"2710","782":"2674","133":"2815","849":"2628","947":"2582","998":"2567","925":"357","926":"326","911":"2643","780":"2350","816":"195","953":"6","826":"50","643":"52","934":"198","917":"2110","941":"2016","903":"145","719":"194","845":"252","768":"2130","732":"251","988":"2000","724":"38","738":"299","851":"254","135":"3101","847":"167","948":"2640","890":"2253","985":"2916","731":"197","771":"155","717":"135","907":"236","681":"97","704":"2241","678":"41","668":"2325","757":"248","913":"2166","884":"265","921":"2466","723":"239","694":"304","977":"328","701":"2692","879":"204","881":"26","875":"12","693":"331","880":"24","860":"2523","974":"2440","753":"119","967":"2541","888":"2142","883":"264","654":"2193","876":"9","696":"147","846":"36","838":"2287","581":"2608","708":"2515","966":"2539","695":"149","878":"2483","987":"2453","740":"302","781":"270","882":"30","705":"2272","706":"2335","943":"2755","820":"2459","999":"2771","906":"2026"};


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
        linkAudit: [],
        auditSignature: ""
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
        test.disabled = busy || !active || exactCount === 0;
        load.disabled = busy || !active || exactCount === 0;
        load.textContent = exactCount ? `Cargar ${exactCount} enlaces` : "Cargar enlaces";
        if (audit) audit.disabled = busy || !active;
        const pending = state.linkAudit.filter(r => r.status === "WRONG_ESPN").length;
        if (fix) {
            fix.disabled = busy || !active || !pending || !state.auditSignature || state.auditSignature !== state.planSignature;
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
            row.id === id ||
            clean(row.dataset.rsSnValue) === id ||
            clean(row.querySelector("input[evento]")?.getAttribute("evento")) === id ||
            row.querySelector(`button[onclick="geEeOpen('${CSS.escape(id)}')"]`)
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

    async function openEditor(item) {
        const row = item.rover.row?.isConnected
            ? item.rover.row
            : await waitForRoverRow(item.rover.roverEventId);
        if (!row) throw new Error("La fila ya no existe");

        const button = findEditButton(row);
        if (!button) throw new Error("No encontré el botón Editar");

        row.scrollIntoView({ block: "center", behavior: "auto" });
        button.click();

        const started = Date.now();
        while (Date.now() - started < 8000) {
            const modal = currentModal();
            if (modal) {
                const serial = clean(
                    modal.form.querySelector("#ge-ee-serial")?.value ||
                    modal.form.querySelector('input[name="evento[]"]')?.value
                );
                if (serial && serial !== item.rover.roverEventId) {
                    await sleep(100);
                    continue;
                }
                return modal;
            }
            await sleep(100);
        }

        throw new Error("El modal de edición no abrió");
    }

    function validateModalEvent(item, modal) {
        const serial = clean(
            modal.form.querySelector("#ge-ee-serial")?.value ||
            modal.form.querySelector('input[name="evento[]"]')?.value
        );
        if (serial && serial !== item.rover.roverEventId) {
            throw new Error(`Modal #${serial}; esperaba #${item.rover.roverEventId}`);
        }

        const team1 = clean(modal.form.querySelector("#ge-ee-team1")?.value);
        const team2 = clean(modal.form.querySelector("#ge-ee-team2")?.value);
        if (team1 && team1 !== item.rover.away.roverCode) {
            throw new Error(`AWAY del modal no coincide (${team1})`);
        }
        if (team2 && team2 !== item.rover.home.roverCode) {
            throw new Error(`HOME del modal no coincide (${team2})`);
        }
    }

    const ESPN_URL_PATTERN = /https?:\/\/[^\s"'<>]*espn\.com\/mens-college-basketball\/game\/_\/gameId\/(\d+)/i;

    function findUrlField(modal) {
        return modal.form.querySelector("#ge-ee-url") ||
            modal.scope.querySelector("#ge-ee-url") ||
            [...modal.form.querySelectorAll("input, select, textarea")].find(element =>
                /event.*results.*url|results.*url/i.test(
                    `${element.id} ${element.name} ${element.placeholder}`
                )
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


    // Strict host/path parser: never treat another provider or football URL as ESPN CBB.
    function strictEspnId(url) {
        const match = clean(url).match(/^https?:\/\/(?:www\.)?espn\.com\/mens-college-basketball\/game\/_\/gameId\/(\d+)(?=[/?#]|$)/i);
        return match?.[1] || "";
    }
    function classifyLink(item, current) {
        if (!current?.url) return "EMPTY";
        const eventId = strictEspnId(current.url);
        if (!eventId) return "OTHER_LINK";
        if (item.status !== "READY" || !item.match?.eventId) return "NEEDS_REVIEW";
        return eventId === String(item.match.eventId) ? "CORRECT" : "WRONG_ESPN";
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
        const review = (c.OTHER_LINK || 0) + (c.NEEDS_REVIEW || 0) + (c.CONFLICT || 0) + (c.ERROR || 0);
        label.textContent = state.linkAudit.length ?
            `Links: ${c.CORRECT || 0} correctos · ${c.WRONG_ESPN || 0} incorrectos · ${c.CORRECTED || 0} corregidos · ${c.EMPTY || 0} vacíos · ${review} revisión` : "";
        const items = state.linkAudit.filter(r => !["CORRECT", "EMPTY"].includes(r.status));
        details.hidden = items.length === 0;
        details.open = items.length > 0;
        details.querySelector("summary").textContent = `Auditoría de links (${items.length})`;
        list.replaceChildren();
        for (const r of items) {
            const line = document.createElement("div");
            line.className = "cbbll-review-item";
            line.textContent = `SN ${r.item.rover.roverEventId} · ${r.status} · ESPN anterior #${r.existingId || "?"} · esperado #${r.item.match?.eventId || "sin validar"}` +
                (r.error ? ` · ${r.error}` : "");
            list.appendChild(line);
        }
    }
    function notifyCorrection(item, oldId, newId) {
        const text = `SN ${item.rover.roverEventId}: ESPN #${oldId} → #${newId}`;
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
        const button = modal.scope.querySelector("#ge-ee-save-btn") ||
            document.querySelector("#ge-ee-save-btn") ||
            findModalButton(modal, /guardar\s+cambios/i) ||
            findModalButton(modal, /^\s*guardar\s*$/i);
        if (!button) throw new Error("No encontré Guardar Cambios");

        button.click();
        const started = Date.now();

        while (Date.now() - started < 10000) {
            const active = currentModal();
            if (!active) return;

            const errorBox = active.scope.querySelector("#ge-ee-msg.err");
            if (errorBox && isVisible(errorBox)) {
                throw new Error(clean(errorBox.textContent) || "Rover rechazó el guardado");
            }

            if (persistedEventId(active) === item.match.eventId) {
                const successBox = active.scope.querySelector("#ge-ee-msg.ok");
                if (successBox && isVisible(successBox)) {
                    // Rover cerrará el modal y ejecutará geReload() 1.5 s después.
                    await sleep(125);
                }
            }

            const success = [...document.querySelectorAll(
                ".toast, .alert, .swal2-popup, [role='alert']"
            )].find(element => isVisible(element) && /guardad|actualizad|success|éxito/i.test(element.textContent));
            if (success && persistedEventId(active) === item.match.eventId) {
                await closeModal(active);
                return;
            }
            await sleep(125);
        }

        throw new Error("No pude confirmar que Rover guardó el enlace");
    }

    async function waitForTableRefresh(previousTable, timeoutMs = 10000) {
        const started = Date.now();

        while (Date.now() - started < timeoutMs) {
            const current = findEventTable();
            const panelWrap = document.getElementById("ge-panel-wrap");
            const interactive = panelWrap?.style.pointerEvents !== "none";

            if (current && current !== previousTable && interactive) return true;
            await sleep(125);
        }

        return false;
    }

    async function processItem(item) {
        const tableBeforeSave = findEventTable();
        let modal = await openEditor(item);

        try {
            // Da tiempo a los componentes dinámicos de Rover y a otros helpers
            // para terminar de montar el formulario antes de escribir.
            await sleep(180);
            modal = currentModal() || modal;
            validateModalEvent(item, modal);
            let field = findUrlField(modal);
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
            field = findUrlField(modal);
            const pendingId = clean(field?.value).match(ESPN_URL_PATTERN)?.[1] || "";
            if (pendingId !== item.match.eventId) {
                throw new Error(
                    `El campo cambió antes de guardar; esperaba ESPN #${item.match.eventId}`
                );
            }

            await saveModal(item, modal);

            if (!(await waitForTableRefresh(tableBeforeSave))) {
                throw new Error("El enlace se guardó, pero la tabla no terminó de recargarse");
            }
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
                const result = { item, status: "ERROR", existingUrl: "", existingId: "", error: "" };
                try {
                    modal = await openEditor(item);
                    await sleep(180);
                    modal = currentModal() || modal;
                    validateModalEvent(item, modal);
                    const data = inspectLink(modal);
                    result.existingUrl = data.current?.url || "";
                    result.existingId = strictEspnId(result.existingUrl);
                    result.status = data.conflict ? "CONFLICT" : classifyLink(item, data.current);
                    if (result.status === "WRONG_ESPN")
                        log(`SN ${item.rover.roverEventId}: link #${result.existingId} incorrecto; corresponde #${item.match.eventId}`, "warn");
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
            log(`Verificación: ${totals.CORRECT || 0} correctos, ${totals.WRONG_ESPN || 0} incorrectos, ${totals.EMPTY || 0} vacíos.`);
            return state.linkAudit;
        } finally {
            if (!completed) state.auditSignature = "";
            state.phase = "ready";
            renderAudit();
            updateButtons();
        }
    }
    async function correctExistingLinks() {
        if (["analyzing", "loading", "auditing", "correcting"].includes(state.phase))
            throw new Error("Ya existe un proceso CBB activo");
        requireAuditedTable();
        if (!state.auditSignature || state.auditSignature !== state.planSignature)
            throw new Error("Primero pulsa Verificar enlaces y completa la auditoría.");
        const wrong = state.linkAudit.filter(r =>
            r.status === "WRONG_ESPN" && r.item.status === "READY" && r.existingId && r.item.match?.eventId);
        if (!wrong.length) { log("No hay enlaces ESPN incorrectos para corregir."); return state.linkAudit; }
        state.phase = "correcting";
        state.stopRequested = false;
        updateButtons();
        setProgress(0, wrong.length);
        try {
            for (let idx = 0; idx < wrong.length; idx++) {
                if (state.stopRequested) break;
                requireAuditedTable();
                const r = wrong[idx], item = r.item, oldId = r.existingId;
                let modal = null;
                try {
                    modal = await openEditor(item);
                    await sleep(180);
                    modal = currentModal() || modal;
                    validateModalEvent(item, modal);
                    const old = inspectLink(modal);
                    if (old.conflict || !old.field || !old.current ||
                        strictEspnId(old.current.url) !== r.existingId ||
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
                    notifyCorrection(item, oldId, r.existingId);
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
        if (["analyzing", "loading", "auditing", "correcting"].includes(state.phase)) return state.plan;
        if (!state.plan.some(item => item.status === "READY")) await analyze();

        if (!isCBBView() || !state.planSignature || currentPlanSignature() !== state.planSignature) {
            state.plan = [];
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

            if (currentPlanSignature() !== state.planSignature) {
                item.loadStatus = "ERROR";
                item.error = "La tabla cambió durante la carga; se detuvo por seguridad";
                log(item.error, "error");
                break;
            }
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
            }

            setProgress(index + 1, ready.length);
            await sleep(250);
        }

        state.phase = "ready";
        state.stopRequested = false;
        updateButtons();

        const saved = ready.filter(item => item.loadStatus === "SAVED").length;
        const existing = ready.filter(item => item.loadStatus === "ALREADY_LINKED").length;
        const errors = ready.filter(item => item.loadStatus === "ERROR").length;
        log(`Finalizado: ${saved} guardados, ${existing} ya vinculados, ${errors} errores.`);
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
            #${PANEL_ID} {
                position: fixed; right: 16px; top: 74px; z-index: 2147483000;
                width: 330px; box-sizing: border-box; padding: 12px;
                color: #17233c; background: #fff; border: 1px solid #b9c9e6;
                border-radius: 10px; box-shadow: 0 10px 30px rgba(15,35,70,.22);
                font: 600 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;
            }
            #${PANEL_ID}[hidden] { display: none !important; }
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
        if (launcher) return launcher;

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
        if (created || state.phase !== "ready") updateButtons();
        return panel;
    }

    const API = {
        version: VERSION,
        analyze,
        load: loadLinks,
        stop,
        verifyLinks: verifyExistingLinks,
        correctLinks: correctExistingLinks,
        getLinkAudit: () => state.linkAudit.map(r => ({ roverEventId: r.item.rover.roverEventId, status: r.status, existingId: r.existingId, expectedId: r.item.match?.eventId || "", error: r.error })),
        getPlan: () => state.plan,
        getSummary: planSummary,
        getLog: () => [...state.log],
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
            strictEspnId,
            classifyLink,
            getCBBRows,
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
