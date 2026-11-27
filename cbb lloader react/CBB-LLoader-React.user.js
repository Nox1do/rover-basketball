// ==UserScript==
// @name         cbb loader react 0.0.1
// @namespace    https://roversport.net/
// @version      0.0.1
// @description  Vincula eventos CBB en Central React con ESPN y revisa horarios, equipos y enlaces.
// @author       noeg
// @match        https://central.roversport.net/*
// @noframes
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        unsafeWindow
// @connect      site.api.espn.com
// @run-at       document-idle
// @grant        window.onurlchange
// @updateURL    https://raw.githubusercontent.com/Nox1do/rover-basketball/main/cbb%20lloader%20react/CBB-LLoader-React.user.js
// @downloadURL  https://raw.githubusercontent.com/Nox1do/rover-basketball/main/cbb%20lloader%20react/CBB-LLoader-React.user.js
// ==/UserScript==

(() => {
    "use strict";

    const VERSION = "0.0.1";
    // Rover usa America/New_York, independientemente de la zona horaria del equipo.
    const ROVER_TIME_ZONE = "America/New_York";
    const TAG = "[CBB Loader React]";
    const PANEL_ID = "cbb-lloader-react-panel";
    const STYLE_ID = "cbb-lloader-react-style";
    const LAUNCHER_ID = "cbb-lloader-react-launcher";
    const ESPN_GAME_URL = id =>
        `https://www.espn.com/mens-college-basketball/game/_/gameId/${id}`;

    // Mapeo CBB 2026-27: 364 identificadores Rover verificados contra ESPN.
    // No mezclar con los IDs Rover usados en CFB: son deportes distintos.
    const TEAM_IDS = {"133":"2815","134":"28","135":"3101","164":"284","176":"2900","179":"88","254":"2546","270":"2330","275":"2697","277":"2603","285":"2441","300":"2837","381":"2698","382":"2385","388":"91","400":"526","581":"2608","631":"399","632":"2066","633":"104","635":"311","636":"160","637":"2619","638":"2378","639":"261","640":"103","641":"228","642":"150","643":"52","644":"59","645":"120","646":"2390","647":"152","648":"153","649":"258","650":"259","651":"154","652":"2057","653":"2097","654":"2193","656":"294","657":"338","658":"288","659":"2382","660":"2454","661":"2908","662":"56","663":"2429","664":"2168","665":"2184","666":"2230","667":"45","668":"2325","669":"113","670":"227","671":"257","673":"179","674":"139","676":"2752","677":"2132","678":"41","679":"305","680":"46","681":"97","682":"269","683":"87","684":"221","685":"2507","686":"164","687":"2550","688":"58","689":"2599","690":"183","691":"222","692":"277","693":"331","694":"304","695":"149","696":"147","697":"2464","698":"2458","699":"2502","700":"16","701":"2692","702":"2127","703":"324","704":"2241","705":"2272","706":"2335","707":"2506","708":"2515","709":"2427","710":"2678","711":"2737","712":"356","713":"84","714":"2294","715":"130","716":"127","717":"135","718":"77","719":"194","720":"213","721":"2509","722":"275","723":"239","724":"38","725":"66","726":"2305","727":"2306","728":"142","729":"158","730":"201","731":"197","732":"251","733":"2511","734":"2641","735":"13","736":"2239","737":"2463","738":"299","739":"279","740":"302","741":"300","742":"27","743":"2540","744":"48","745":"2182","746":"2244","747":"2247","748":"2275","749":"256","750":"350","751":"111","752":"295","753":"119","754":"2670","755":"2729","756":"151","757":"248","758":"276","759":"235","760":"242","762":"2572","763":"2655","764":"202","765":"5","766":"2116","767":"2638","768":"2130","769":"2277","770":"2885","771":"155","772":"233","773":"3084","774":"245","775":"2086","776":"325","777":"2174","778":"2739","779":"82","780":"2350","781":"270","782":"2674","783":"2750","784":"2754","785":"2934","786":"2344","787":"2428","788":"2443","790":"2547","791":"2565","793":"225","794":"171","795":"172","796":"159","797":"108","798":"219","799":"163","800":"43","801":"2099","802":"2217","803":"314","804":"2352","805":"2363","806":"2368","807":"315","808":"2520","809":"2561","810":"2612","811":"2006","812":"189","813":"2084","814":"2309","815":"193","816":"195","817":"2050","818":"2117","819":"2199","820":"2459","821":"2649","822":"2711","823":"2065","824":"2154","825":"2169","826":"50","827":"2261","828":"47","829":"2379","830":"2415","831":"2448","832":"2450","834":"71","835":"156","836":"2181","837":"339","838":"2287","839":"282","840":"2623","841":"2460","842":"79","843":"2724","844":"2005","845":"252","846":"36","847":"167","848":"21","849":"2628","850":"2439","851":"254","852":"2751","853":"2803","854":"2115","855":"161","856":"112358","857":"2405","858":"116","859":"2514","860":"2523","861":"2529","864":"2681","865":"2046","866":"2197","867":"2198","868":"55","869":"2413","870":"93","872":"2634","873":"2635","874":"2630","875":"12","876":"9","877":"25","878":"2483","879":"204","880":"24","881":"26","882":"30","883":"264","884":"265","885":"44","886":"349","887":"2083","888":"2142","889":"107","890":"2253","891":"2329","892":"2426","893":"57","894":"61","895":"96","896":"2569","897":"2633","898":"238","899":"333","900":"8","901":"2","902":"99","903":"145","904":"344","905":"2535","906":"2026","907":"236","908":"2210","909":"2430","910":"2717","911":"2643","912":"232","913":"2166","914":"231","915":"290","916":"2747","917":"2110","918":"2320","919":"2377","920":"2447","921":"2466","922":"2545","923":"2534","924":"2617","925":"357","926":"326","927":"250","928":"2636","930":"2870","931":"85","932":"2449","933":"2473","934":"198","935":"2571","936":"253","937":"140","938":"2710","939":"2010","940":"2011","941":"2016","942":"2029","943":"2755","944":"2296","945":"2400","946":"2504","947":"2582","948":"2640","949":"98","950":"2229","951":"2226","952":"2393","953":"6","954":"2653","955":"2031","956":"2032","957":"2172","958":"249","959":"309","960":"2433","961":"2250","962":"2351","963":"2492","964":"2501","965":"301","966":"2539","967":"2541","969":"68","970":"278","971":"62","972":"70","973":"2348","974":"2440","975":"166","976":"23","977":"328","979":"2437","980":"94","981":"322","982":"292","983":"2349","984":"2856","985":"2916","987":"2453","988":"2000","996":"2579","997":"218","998":"2567","999":"2771"};


    // Prevent competing intervals/panels when the same loader is injected twice.
    // Legacy v0.1.0/v0.1.1 instances do not have this contract and must be disabled in Tampermonkey.
    const RUNTIME_KEY = "__CBB_LLOADER_REACT_RUNTIME__";
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
    let panelObserver = null;
    let panelTimer = null;
    let observedContext = "";
    const runtime = {
        version: VERSION,
        active: true,
        dispose() {
            if (!this.active) return;
            this.active = false;
            state.stopRequested = true;
            panelObserver?.disconnect();
            clearTimeout(panelTimer);
            window.removeEventListener("popstate", schedulePanelRefresh);
            window.removeEventListener("urlchange", schedulePanelRefresh);
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
        planSignature: "",
        planSelectedDate: "",
        planServer: "",
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

    function uiDiagnostics() {
        return {
            version: VERSION,
            route: location.pathname,
            date: getGlobalIsoDate(),
            server: currentServer(),
            rows: getRoverEvents().length
        };
    }

    function isVisible(element) {
        if (!element) return false;
        const style = getComputedStyle(element);
        return style.display !== "none" &&
            style.visibility !== "hidden" &&
            element.getClientRects().length > 0;
    }

    const CENTRAL_PATH = "/deportes/eventos/central";
    const CENTRAL_TITLE = /^eventos\s*[—–-]\s*central$/i;
    const LEAGUE_TITLE = /^(?:CBB|NCAAB|NCAAM|NCAA MEN(?:'S)?|MEN'S COLLEGE BASKETBALL)$/i;
    const SPANISH_MONTHS = "ene feb mar abr may jun jul ago sep oct nov dic".split(" ");
    let leagueView = null;
    let dateToolbarTrigger = null;

    function onCentralRoute() {
        return location.pathname.replace(/\/$/, "") === CENTRAL_PATH;
    }

    function centralRoot() {
        if (!onCentralRoute()) return null;
        const heading = [...document.querySelectorAll("main :is(h1,h2,h3,[role='heading'])")]
            .find(node => CENTRAL_TITLE.test(clean(node.textContent)));
        return heading?.closest("main") ?? null;
    }

    function eventColumns(table) {
        const headers = [...(table?.tHead?.rows[0]?.cells ?? [])].map(cell => upper(cell.textContent));
        const columns = {
            schedule: headers.findIndex(value => /\bHORA\b.*\bSN\b/.test(value)),
            away: headers.indexOf("VISITANTE"),
            home: headers.indexOf("LOCAL")
        };
        return Object.values(columns).every(index => index >= 0) ? columns : null;
    }

    function findLeagueView() {
        const root = centralRoot();
        if (!root) {
            leagueView = null;
            return null;
        }
        if (leagueView && root.contains(leagueView.marker) && root.contains(leagueView.table) &&
            leagueView.group.contains(leagueView.marker) && leagueView.group.contains(leagueView.table) &&
            LEAGUE_TITLE.test(clean(leagueView.marker.textContent))) return leagueView;

        const matches = new Map();
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!LEAGUE_TITLE.test(clean(node.nodeValue))) continue;
            const marker = node.parentElement;
            if (!marker || marker.closest("table, [role='dialog'], [role='alert'], [role='status'], button, a") ||
                !isVisible(marker)) continue;
            for (let group = marker.parentElement; group && group !== root; group = group.parentElement) {
                const tables = group.querySelectorAll("table");
                if (tables.length === 0) continue;
                if (tables.length === 1 && eventColumns(tables[0])) {
                    matches.set(tables[0], { table: tables[0], marker, group });
                }
                break;
            }
        }
        leagueView = matches.size === 1 ? [...matches.values()][0] : null;
        return leagueView;
    }

    function findEventTable() {
        return findLeagueView()?.table ?? null;
    }

    function getCBBRows(table = findEventTable()) {
        if (!table || table !== findEventTable()) return [];
        return [...table.tBodies].flatMap(body => [...body.rows]).filter(row => findEditButton(row));
    }

    function parseDisplayDate(text) {
        const value = clean(text).toLowerCase();
        const parts = value.match(/^(\d{1,2})\s+(?:de\s+)?([a-z]{3,10})\.?\s+(?:de\s+)?(\d{4})$/);
        if (!parts) return "";
        const month = SPANISH_MONTHS.indexOf(parts[2].slice(0, 3)) + 1;
        if (!month) return "";
        const iso = `${parts[3]}-${String(month).padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        const day = new Date(`${iso}T00:00:00Z`);
        return Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== iso ? "" : iso;
    }

    function getGlobalIsoDate() {
        const root = centralRoot();
        if (!root) return "";
        if (!dateToolbarTrigger || !root.contains(dateToolbarTrigger)) {
            dateToolbarTrigger = [...root.querySelectorAll("button")].find(button =>
                clean(button.textContent) === "Recargar" && !button.closest("table, [role='dialog']")
            );
        }
        const reload = dateToolbarTrigger;
        // The date picker and Recargar share a toolbar. Keep the lookup outside
        // the league tables and ignore calendar popovers and the event editor.
        for (let bar = reload?.parentElement; bar && bar !== root; bar = bar.parentElement) {
            if (bar.querySelector("table")) break;
            const dates = [...new Set([...bar.querySelectorAll("button")].filter(button =>
                !button.closest("[role='dialog']") && isVisible(button)
            ).map(button => parseDisplayDate(button.textContent)).filter(Boolean))];
            if (dates.length) return dates.length === 1 ? dates[0] : "";
        }
        return "";
    }

    function currentServer() {
        const picker = document.querySelector(
            '[title="Servidor cuyos datos se están viendo"], [aria-label="Servidor cuyos datos se están viendo"], ' +
            '[aria-description="Servidor cuyos datos se están viendo"]'
        );
        const badge = document.querySelector('[title^="Servidor:"], [aria-label^="Servidor:"]');
        return clean(picker?.textContent || badge?.getAttribute("title") || badge?.getAttribute("aria-label"));
    }

    function isCBBView() {
        return Boolean(findEventTable() && getGlobalIsoDate());
    }

    function parseTeamCell(cell) {
        const team = cell?.querySelector("button");
        if (!team) return null;
        const label = clean(team.innerText || team.textContent);
        const name = clean(team.getAttribute("title"));
        const parts = label.match(/^(\d{2,5})\s*(\D.+)$/);
        if (!parts) return null;
        return { roverCode: parts[1], roverName: name || clean(parts[2]) };
    }

    function parseReactSchedule(cell) {
        if (!cell) return null;
        // Text nodes keep the original time and SN distinct from an ESPN
        // alternate time and from warnings in the same cell.
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        let timeRaw = "";
        let roverEventId = "";
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.parentElement?.closest("button, a")) continue;
            const value = clean(node.nodeValue);
            if (!timeRaw && /^\d{1,2}:\d{2}\s*(?:AM|PM)$/i.test(value)) timeRaw = value;
            if (/^\d{5,}$/.test(value)) {
                if (roverEventId && roverEventId !== value) return null;
                roverEventId = value;
            }
        }
        const timeMinutes = parseClockMinutes(timeRaw);
        return roverEventId ? { roverEventId, timeRaw, timeMinutes, time: formatClockMinutes(timeMinutes) } : null;
    }

    function parseRoverRow(row, date = getGlobalIsoDate(), columns = eventColumns(row?.closest("table"))) {
        if (!row || !date || !columns) return null;
        const schedule = parseReactSchedule(row.cells[columns.schedule]);
        const away = parseTeamCell(row.cells[columns.away]);
        const home = parseTeamCell(row.cells[columns.home]);
        return schedule && away && home ? { ...schedule, date, away, home, row } : null;
    }

    function getRoverEvents() {
        const table = findEventTable();
        const date = getGlobalIsoDate();
        if (!table || !date) return [];
        const columns = eventColumns(table);
        const events = new Map();
        const duplicates = new Set();
        for (const row of getCBBRows(table)) {
            const event = parseRoverRow(row, date, columns);
            if (!event) continue;
            if (events.has(event.roverEventId)) duplicates.add(event.roverEventId);
            events.set(event.roverEventId, event);
        }
        return [...events.values()].filter(event => !duplicates.has(event.roverEventId));
    }

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
        const rows = getRoverEvents().map(event => [
            event.roverEventId, event.date, event.timeMinutes,
            event.away.roverCode, event.home.roverCode
        ]).sort((a, b) => a[0].localeCompare(b[0]));
        return JSON.stringify([getGlobalIsoDate(), currentServer(), rows]);
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
        const validPlan = active && state.planSelectedDate === getGlobalIsoDate() && state.planServer === currentServer();

        analyze.disabled = busy || !active;
        test.disabled = busy || !validPlan || exactCount === 0;
        load.disabled = busy || !validPlan || exactCount === 0;
        load.textContent = exactCount ? `Cargar ${exactCount} enlaces` : "Cargar enlaces";
        if (audit) audit.disabled = busy || !active;
        const pending = state.linkAudit.filter(isCorrectableAudit).length;
        if (fix) {
            fix.disabled = busy || !validPlan || !pending || !state.auditSignature || state.auditSignature !== state.planSignature;
            fix.textContent = pending ? `Corregir ${pending} incorrectos` : "Corregir incorrectos";
        }
        stop.hidden = !busy;
    }

    async function analyze() {
        if (["analyzing", "loading", "auditing", "correcting"].includes(state.phase)) return state.plan;
        if (!isCBBView()) throw new Error("Abre Eventos — Central y espera que aparezcan la fecha y la tabla CBB.");

        const roverEvents = getRoverEvents();
        if (!roverEvents.length) throw new Error("No encontré filas CBB con SN y equipos legibles.");

        state.phase = "analyzing";
        state.plan = [];
        state.linkAudit = [];
        state.auditSignature = "";
        state.planSignature = currentPlanSignature();
        state.planSelectedDate = getGlobalIsoDate();
        state.planServer = currentServer();
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
        return [...row.querySelectorAll("button")].find(button =>
            [button.getAttribute("aria-label"), button.title, button.textContent]
                .some(label => /^editar$/i.test(clean(label)))
        ) ?? null;
    }

    function findRoverRow(roverEventId) {
        const table = findEventTable();
        const columns = table && eventColumns(table);
        if (!columns) return null;
        const matches = getCBBRows(table).filter(row =>
            parseReactSchedule(row.cells[columns.schedule])?.roverEventId === String(roverEventId)
        );
        return matches.length === 1 ? matches[0] : null;
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
        // This dialog is rendered in a portal outside the Central page.
        const dialogs = [...document.querySelectorAll('[role="dialog"], dialog[open]')].filter(isVisible);
        for (const scope of dialogs.reverse()) {
            const title = [...scope.querySelectorAll('h1, h2, h3, [role="heading"]')].find(node =>
                /^modificar evento\s*[—–-]\s*baloncesto\s*#/i.test(clean(node.textContent))
            );
            const id = clean(title?.textContent).match(/#\s*(\d+)\s*$/)?.[1];
            if (id) return { form: scope, scope, id };
        }
        return null;
    }

    function hasOpenDialog() {
        return [...document.querySelectorAll('[role="dialog"], dialog[open]')].some(isVisible);
    }

    const teamNameKey = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    function modalReadiness(item, modal) {
        if (!modal?.form || !modal.scope.isConnected) return { ready: false, reason: "formulario ausente" };
        const rover = item.rover;
        if (modal.id !== rover.roverEventId) return { ready: false, reason: "otro SN", mismatch: true };
        const scope = modal.scope;
        const described = clean(scope.getAttribute("aria-describedby")?.split(/\s+/)
            .map(id => document.getElementById(id))
            .filter(node => node && scope.contains(node))
            .map(node => node.textContent).join(" "));
        const expected = teamNameKey(`${rover.away.roverName} vs. ${rover.home.roverName}`);
        const matchup = [described, ...[...scope.querySelectorAll("p")].map(node => node.textContent)]
            .some(value => teamNameKey(value) === expected);
        if (!matchup) return { ready: false, reason: "equipos distintos o pendientes" };

        const controls = [...scope.querySelectorAll("button")].map(button => clean(button.textContent));
        if (!controls.some(value => parseDisplayDate(value) === rover.date))
            return { ready: false, reason: "fecha distinta o pendiente" };
        if (Number.isInteger(rover.timeMinutes) && !controls.some(value =>
            /^\d{1,2}:\d{2}\s*(?:AM|PM)$/i.test(value) && parseClockMinutes(value) === rover.timeMinutes
        )) return { ready: false, reason: "hora distinta o pendiente" };

        const field = findUrlField(modal);
        return field
            ? { ready: true, reason: "listo", field }
            : { ready: false, reason: "URL sin montar" };
    }

    async function openEditor(item) {
        if (hasOpenDialog()) throw new Error(
            "Hay un diálogo de Central abierto. Ciérralo antes de procesar este evento."
        );
        const row = await waitForRoverRow(item.rover.roverEventId, 5000);
        if (!row) throw new Error("La fila ya no existe");
        if (!isPlanContextSafe(item, row) || hasOpenDialog())
            throw new Error("El evento, la vista o el diálogo cambiaron antes de abrir el editor.");
        item.rover.row = row;
        const button = findEditButton(row);
        if (!button || button.disabled) throw new Error("Editar no está disponible para este evento.");
        row.scrollIntoView({ block: "center", behavior: "auto" });
        button.click();

        const started = Date.now();
        let reason = "modal no visible";
        let ownedModal = null;
        while (Date.now() - started < 10000) {
            const modal = currentModal();
            if (modal) {
                const status = modalReadiness(item, modal);
                if (status.ready) return modal;
                reason = status.reason;
                if (status.mismatch) break;
                ownedModal = modal;
            }
            await sleep(100);
        }
        if (ownedModal) await closeModal(ownedModal);
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

    function resultsUrlLabel(text) {
        const value = clean(text);
        return /^url\s+de\s+resultados\s+del\s+evento$/i.test(value) ||
            /^event[\s_-]*results?[\s_-]*url$/i.test(value);
    }

    function findUrlField(modal) {
        if (!modal?.scope) return null;
        const fields = [...modal.scope.querySelectorAll('input:not([type]), input[type="text"], input[type="url"], textarea')]
            .filter(field => !field.readOnly && !field.disabled && isVisible(field));
        const named = fields.filter(field => [
            field.name, field.id, field.getAttribute("aria-label"),
            ...[...(field.labels ?? [])].map(label => label.textContent),
            ...clean(field.getAttribute("aria-labelledby")).split(/\s+/)
                .map(id => document.getElementById(id)?.textContent)
        ].some(resultsUrlLabel));
        if (named.length) return named.length === 1 ? named[0] : null;

        // Central displays a visible label and a placeholder for the field.
        // The placeholder only identifies it inside the results-URL group.
        const labels = [...modal.scope.querySelectorAll("label, span, div, p")]
            .filter(node => resultsUrlLabel(node.textContent) &&
                ![...node.children].some(child => resultsUrlLabel(child.textContent)));
        const candidates = new Set();
        for (const label of labels) {
            for (let group = label; group && group !== modal.scope; group = group.parentElement) {
                const local = fields.filter(field => group.contains(field));
                if (!local.length) continue;
                if (local.length === 1 && /^https?:\/\//i.test(local[0].placeholder)) candidates.add(local[0]);
                break;
            }
        }
        return candidates.size === 1 ? [...candidates][0] : null;
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
            return { url, eventId: strictEspnId(url) };
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
        const unrecognized = Boolean(clean(field?.value) && !fieldUrl);
        return { field, current, conflict: unrecognized || Boolean(fieldUrl && actualUrl && fieldUrl !== actualUrl) };
    }
    function auditTotals() {
        return state.linkAudit.reduce((sum, r) => {
            sum[r.status] = (sum[r.status] || 0) + 1;
            return sum;
        }, {});
    }
    // A matching ESPN candidate does not prove the same game when home/away or time disagree.
    function auditReviewExplanation(report) {
        if (report?.status !== "NEEDS_REVIEW" || !report.item) return null;
        const item = report.item;
        const candidates = [...new Map((item.candidates || [])
            .filter(event => event?.eventId)
            .map(event => [String(event.eventId), event])).values()];
        const candidateIds = candidates.map(event => String(event.eventId));
        const currentId = clean(report.existingId);
        const matchesCandidate = Boolean(currentId && candidateIds.includes(currentId));
        const linkAssessment = matchesCandidate
            ? "El enlace actual #" + currentId +
                " coincide con un candidato ESPN, pero la discrepancia impide validarlo automáticamente."
            : candidateIds.length
                ? "El enlace actual #" + (currentId || "?") +
                    " NO coincide con los candidatos ESPN #" + candidateIds.join(", #") +
                    ". Revisar manualmente; no se reemplaza automáticamente."
                : "No hay un candidato ESPN comprobable para contrastar con el enlace actual.";
        let teamsComparison = "";
        if (item.status.startsWith("REVERSED_PAIR") && candidates.length) {
            const candidate = candidates[0];
            teamsComparison = "Rover: visitante " + item.rover.away.roverName +
                ", local " + item.rover.home.roverName + ". ESPN: visitante " +
                (candidate.away || "sin nombre") + ", local " +
                (candidate.home || "sin nombre") + ".";
        }
        return {
            matchupStatus: item.status,
            reason: reviewReason(item),
            candidateIds,
            matchesCandidate,
            linkAssessment,
            teamsComparison
        };
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
            const review = auditReviewExplanation(r);
            const reference = r.item.match?.eventId ? "#" + r.item.match.eventId :
                review?.candidateIds.length ? "candidatos #" + review.candidateIds.join(", #") : "sin validar";
            line.textContent = `SN ${r.item.rover.roverEventId} · ${r.status}${competition} · ESPN anterior #${r.existingId || "?"} · esperado ${reference}${source}` +
                (r.error ? ` · ${r.error}` : "");
            if (review) {
                for (const detailText of [
                    "Motivo: " + review.reason,
                    review.teamsComparison,
                    review.linkAssessment
                ]) {
                    if (!detailText) continue;
                    const detail = document.createElement("div");
                    detail.className = "cbbll-review-reason cbbll-audit-reason";
                    detail.textContent = detailText;
                    line.appendChild(detail);
                }
            }
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

    function findModalButton(modal, pattern) {
        return [...modal.scope.querySelectorAll("button")].find(button =>
            isVisible(button) && [button.textContent, button.title, button.getAttribute("aria-label")]
                .some(label => pattern.test(clean(label)))
        ) ?? null;
    }

    function writeUrlField(field, url) {
        // Use the native setter so React's controlled input observes the change.
        const win = field.ownerDocument.defaultView;
        const prototype = field.tagName === "TEXTAREA" ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
        const setValue = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (!setValue) throw new Error("No pude actualizar la URL del formulario.");
        setValue.call(field, url);
        field.dispatchEvent(new win.Event("input", { bubbles: true }));
        if (clean(field.value) !== url) throw new Error("El campo URL rechazó el enlace.");
    }

    async function closeModal(modal) {
        const active = currentModal();
        if (!active || active.scope !== modal?.scope || pendingSaves.has(active.scope)) return;
        const button = findModalButton(active, /^cancelar$/i) || findModalButton(active, /^cerrar$/i);
        if (button) button.click();
        const started = Date.now();
        while (currentModal()?.scope === active.scope && Date.now() - started < 3000) await sleep(100);
    }

    const pendingSaves = new WeakSet();

    async function saveModal(item, modal) {
        validateModalEvent(item, modal);
        if (!isPlanContextSafe(item) || currentModal()?.scope !== modal.scope)
            throw new Error("El evento o la vista cambiaron antes de guardar.");
        if (clean(findUrlField(modal)?.value) !== item.url)
            throw new Error("La URL del formulario cambió antes de guardar.");
        const button = findModalButton(modal, /^guardar cambios$/i);
        if (!button || button.disabled || button.getAttribute("aria-disabled") === "true")
            throw new Error("Guardar cambios no está disponible.");

        pendingSaves.add(modal.scope);
        button.click();
        const start = Date.now();
        while (Date.now() - start < 12000) {
            if (currentModal()?.scope !== modal.scope) {
                pendingSaves.delete(modal.scope);
                return;
            }
            await sleep(125);
        }
        throw new Error("Central dejó el editor abierto tras guardar. Comprueba el enlace antes de continuar.");
    }

    async function waitForTableRefresh(previousTable, previousRow, timeoutMs = 10000) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            const table = findEventTable();
            if (table && isCBBView() && !hasOpenDialog() &&
                (table !== previousTable || !previousRow?.isConnected || Date.now() - started >= 1000)) return true;
            await sleep(125);
        }
        return false;
    }

    function isPlanContextSafe(item = null, liveRow = null) {
        if (!isCBBView() || !state.planSignature || !state.plan.length) return false;
        // Selected date is a global guard. Per-row identity must be verified
        // separately because Rover rebuilds, filters and reorders the table.
        if (state.planSelectedDate !== getGlobalIsoDate() || state.planServer !== currentServer()) return false;
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
            const saved = inspectLink(modal);
            if (saved.field !== savedField || saved.conflict || strictEspnId(saved.current?.url) !== String(item.match.eventId))
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
            const { current: existing, conflict } = inspectLink(modal);
            if (conflict || !field) throw new Error("La URL actual del evento requiere revisión.");

            if (strictEspnId(existing?.url) === String(item.match.eventId)) {
                await closeModal(modal);
                return "ALREADY_LINKED";
            }

            if (existing) {
                throw new Error(
                    `Ya existe un enlace (${linkDomainPath(existing.url)}); no se reemplazó por ESPN #${item.match.eventId}`
                );
            }

            writeUrlField(field, item.url);

            // Revalida justo antes de guardar: otro userscript podría haber
            // reemplazado el control o cambiado su valor mientras se abría.
            await sleep(120);
            modal = currentModal() || modal;
            validateModalEvent(item, modal);
            field = await waitForUrlField(item, 1400);
            const pendingId = strictEspnId(field?.value);
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
            #${PANEL_ID} .cbbll-audit-reason { line-height:1.4; white-space:normal; overflow-wrap:anywhere; }
            #${LAUNCHER_ID} {
                position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
                border: 0; border-radius: 8px; padding: 9px 12px; color: #fff;
                background: #1e40af; cursor: pointer; font: 700 13px system-ui, sans-serif;
            }
            #${PANEL_ID} { width: min(350px, calc(100vw - 32px)); }
        `;
        document.head.appendChild(style);
    }

    function ensureLauncher() {
        let launcher = document.getElementById(LAUNCHER_ID);
        if (launcher) return launcher;
        launcher = document.createElement("button");
        launcher.id = LAUNCHER_ID;
        launcher.type = "button";
        launcher.textContent = "🏀 CBB Loader React";
        launcher.setAttribute("aria-controls", PANEL_ID);
        launcher.setAttribute("aria-expanded", "true");
        launcher.addEventListener("click", () => {
            const panel = ensurePanel();
            panel.hidden = !panel.hidden;
            launcher.setAttribute("aria-expanded", String(!panel.hidden));
        });
        document.body.appendChild(launcher);
        return launcher;
    }

    function ensurePanel() {
        installStyles();
        let panel = document.getElementById(PANEL_ID);

        if (!panel) {
            panel = document.createElement("section");
            panel.id = PANEL_ID;
            panel.innerHTML = `
                <div class="cbbll-title">
                    <span>🏀 CBB Loader React</span>
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

        return panel;
    }

    function refreshPanel() {
        if (!runtime.active) return;
        if (!onCentralRoute()) {
            document.getElementById(PANEL_ID)?.remove();
            document.getElementById(LAUNCHER_ID)?.remove();
            observedContext = "";
            return;
        }
        const panel = ensurePanel();
        ensureLauncher();
        const active = isCBBView();
        const context = JSON.stringify([active, getGlobalIsoDate(), currentServer()]);
        if (context === observedContext) return;
        observedContext = context;
        if (state.phase === "idle") {
            panel.querySelector('[data-role="last"]').textContent = active
                ? "Tabla CBB detectada. Listo para analizar."
                : "Esperando la fecha y la tabla CBB de Central…";
        }
        updateButtons();
    }

    function schedulePanelRefresh() {
        if (panelTimer !== null) return;
        panelTimer = setTimeout(() => {
            panelTimer = null;
            refreshPanel();
        }, 160);
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
            expectedId: r.item.match?.eventId || "", correctable: isCorrectableAudit(r),
            matchupStatus: r.item.status,
            reviewReason: auditReviewExplanation(r)?.reason || "",
            candidateIds: auditReviewExplanation(r)?.candidateIds || [],
            matchesCandidate: auditReviewExplanation(r)?.matchesCandidate ?? false,
            error: r.error })),
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
            auditReviewExplanation,
            isCorrectableAudit,
            getCBBRows,
            findRoverRow,
            isPlanContextSafe,
            waitForTableRefresh,
            parseDisplayDate
        }),
        clearCache() {
            state.scoreboardCache.clear();
            state.scheduleCache.clear();
        }
    };

    expose("__CBB_LLOADER_REACT", API);
    refreshPanel();
    panelObserver = new MutationObserver(records => {
        if (records.some(({ target }) => !target.parentElement?.closest(`#${PANEL_ID}, #${LAUNCHER_ID}`))) {
            schedulePanelRefresh();
        }
    });
    panelObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("popstate", schedulePanelRefresh);
    window.addEventListener("urlchange", schedulePanelRefresh);
    console.log(`${TAG} v${VERSION} cargado. Dataset: ${Object.keys(TEAM_IDS).length} equipos.`);
})();
