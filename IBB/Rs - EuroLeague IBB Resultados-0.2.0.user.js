// ==UserScript==
// @name         Rs - EuroLeague IBB Resultados
// @namespace    https://roversport.net/
// @version      0.2.0
// @description  IBB EuroLeague: misma arquitectura estable del CFL; vinculación manual y actualización manual Q1-Q4/OT/F.
// @author       noeg
// @match        https://www.roversport.net/adm/es/*
// @match        https://roversport.net/adm/es/*
// @match        https://www.roversport.lol/adm/es/*
// @match        https://roversport.lol/adm/es/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      feeds.incrowdsports.com
// @connect      live.euroleague.net
// @run-at       document-idle
// ==/UserScript==

(() => {
    "use strict";

    const VERSION = "0.2.0";
    const TAG = "[EuroLeague IBB]";

    const UI_ID = "rs-el-ibb-ui";
    const STYLE_ID = "rs-el-ibb-style";
    const LINK_PREFIX = "rs_euroleague_ibb_link_v2_";

    const FS_HEADERS = {
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.flashscore.com/",
        "x-fsign": "SW9D1eZo"
    };

    const FS_FEED_HOSTS = [
        "https://local-global.flashscore.ninja/2/x/feed/",
        "https://www.flashscore.com/x/feed/",
        "https://global.flashscore.ninja/2/x/feed/"
    ];

    const uiState = {
        renderSeq: 0,
        renderTimer: 0,
        pendingSafetyTimer: 0,
        manualCandidates: new Map(),
        observedContainer: null,
        containerObserver: null,
        pollTimer: 0,
        active: false,
        lastEditorId: "",

        // UI estilo Soccer.
        listExpanded: false,
        collapseTimer: 0,
        selectedEventId: "",
        filterValue: "",
        candidatesDate: "",
        loadingCandidates: false,
        lastLoadError: "",

        /*
         * El editor Rover puede re-renderizarse después de escribir scores.
         * Guardamos aquí el último estado mostrado para reconstruirlo en la
         * barra sin obligar a pulsar ↻ una segunda vez.
         */
        lastNoticeByEvent: Object.create(null)
    };

    const dayCache = new Map();
    const DAY_CACHE_TTL_MS = 15 * 1000;

    /*
     * v1.0.11 - transporte rápido.
     * feedInFlight evita solicitudes duplicadas al mismo feed.
     * preferredFeedHost recuerda el último host EuroLeague saludable.
     */
    const feedInFlight = new Map();
    let preferredFeedHost = FS_FEED_HOSTS[0];

    /*
     * Rover NO recarga #tablaEventos al cambiar CATEGORY / LEAGUE / DATE.
     * Los selects pueden decir CFL mientras la tabla todavía contiene CFB.
     *
     * Regla v1.0.6:
     * - cambiar un filtro => dirty=true y ocultar UI CFL.
     * - pulsar Search => esperar una transición REAL de #tablaEventos.
     * - solo después de esa transición se permite renderizar CFL.
     */
    const contextGate = {
        dirty: false,
        searchRequested: false,
        signature: "",
        staleFingerprint: "",
        staleTableNode: null,
        watchToken: 0
    };

    // ============================================================
    // UTILIDADES
    // ============================================================

    const clean = value =>
        String(value ?? "")
            .replace(/\s+/g, " ")
            .trim();

    const upper = value => clean(value).toUpperCase();

    function expose(name, value) {
        try {
            window[name] = value;
        } catch (_) {}

        try {
            if (typeof unsafeWindow !== "undefined") {
                unsafeWindow[name] = value;
            }
        } catch (_) {}
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function numericOrBlank(value) {
        if (value === null || value === undefined || value === "") {
            return "";
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : "";
    }

    function sumScoreParts(values) {
        let total = 0;

        for (const value of values) {
            if (value === "" || value === null || value === undefined) {
                continue;
            }

            const number = Number(value);
            if (!Number.isFinite(number)) {
                return null;
            }

            total += number;
        }

        return total;
    }

    function dispatchValueEvents(element) {
        if (!element) return;

        try {
            element.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (_) {}

        try {
            element.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (_) {}
    }

    function setRoverFieldValue(element, value) {
        if (!element) {
            return {
                changed: false,
                skipped: true,
                previous: "",
                value
            };
        }

        const next = String(value ?? "");
        const previous = String(element.value ?? "");

        if (previous === next) {
            return {
                changed: false,
                skipped: false,
                previous,
                value: next
            };
        }

        element.value = next;
        dispatchValueEvents(element);

        return {
            changed: true,
            skipped: false,
            previous,
            value: next
        };
    }

    function clearRoverFieldValue(element) {
        return setRoverFieldValue(element, "0");
    }

    // ============================================================
    // GUARD: SOLO BASKETBALL > IBB
    // ============================================================

    function findSelectByLabel(labelText) {
        const wanted = upper(labelText);

        if (wanted === "CATEGORY") {
            const category = document.querySelector(
                'select#categoria, select[name="categoria"], select[name="category"]'
            );
            if (category) {
                return category;
            }
        }

        const markers = document.querySelectorAll(
            'label, h1, h2, h3, h4, h5, h6, .box-title'
        );

        for (const marker of markers) {
            if (!upper(marker.textContent).includes(wanted)) {
                continue;
            }

            const forId = marker.getAttribute?.("for");

            if (forId) {
                const target = document.getElementById(forId);
                if (target?.tagName === "SELECT") {
                    return target;
                }
            }

            const containers = [
                marker.parentElement,
                marker.closest?.(".example"),
                marker.closest?.(".form-group"),
                marker.closest?.("[class*='col-']")
            ].filter(Boolean);

            for (const container of containers) {
                const local = container.querySelector?.("select");
                if (local) {
                    return local;
                }
            }
        }

        const selects = [...document.querySelectorAll("select")];

        if (wanted === "CATEGORY") {
            return selects.find(select =>
                [...select.options].some(option =>
                    upper(option.textContent) === "BASKETBALL"
                )
            ) || null;
        }

        if (wanted === "LEAGUE") {
            return selects.find(select =>
                [...select.options].some(option =>
                    upper(option.textContent) === "IBB"
                )
            ) || null;
        }

        return null;
    }

    function getSelected(select) {
        if (!select) {
            return { value: "", text: "" };
        }

        const option = select.options[select.selectedIndex];

        return {
            value: upper(select.value),
            text: upper(option?.textContent)
        };
    }

    function getContext() {
        return {
            category: getSelected(findSelectByLabel("CATEGORY")),
            league: getSelected(findSelectByLabel("LEAGUE")),
            date: getIsoDate(),
            tableExists: !!document.querySelector("#tablaEventos"),
            editorExists: !!document.querySelector("#resEditContainer")
        };
    }

    function currentFilterSignature() {
        const category = getSelected(findSelectByLabel("CATEGORY"));
        const league = getSelected(findSelectByLabel("LEAGUE"));

        return [
            category.value,
            category.text,
            league.value,
            league.text,
            getIsoDate()
        ].join("|");
    }

    function isCflSelection() {
        const ctx = getContext();

        const categoryText = `${ctx.category.value} ${ctx.category.text}`;
        const leagueText = `${ctx.league.value} ${ctx.league.text}`;

        const categoryOK =
            ctx.category.value === "2" ||
            /\bBASKETBALL\b/.test(categoryText);

        const leagueOK =
            ctx.league.value === "66" ||
            /\bIBB\b/.test(leagueText);

        return categoryOK && leagueOK;
    }

    function tableFingerprint() {
        const table = document.querySelector("#tablaEventos");

        if (!table) {
            return "";
        }

        const rows = [...table.querySelectorAll("tr")].map(row => {
            const tkt = clean(row.getAttribute("tkt"));
            const content = clean(row.getAttribute("data-content"));
            const text = clean(row.innerText);

            return `${tkt}::${content}::${text}`;
        });

        return rows.join("||");
    }

    function isFilterControl(target) {
        if (!(target instanceof Element)) {
            return false;
        }

        const categorySelect = findSelectByLabel("CATEGORY");
        const leagueSelect = findSelectByLabel("LEAGUE");

        return Boolean(
            target === categorySelect ||
            target === leagueSelect ||
            target.matches("#fecha, [name='fecha']")
        );
    }

    function markFiltersDirty() {
        contextGate.dirty = true;
        contextGate.searchRequested = false;
        contextGate.signature = currentFilterSignature();
        contextGate.staleFingerprint = tableFingerprint();
        contextGate.staleTableNode =
            document.querySelector("#tablaEventos");

        removeUi();
    }

    function isMainSearchButton(target) {
        if (!(target instanceof Element)) {
            return false;
        }

        const control = target.closest(
            'button, input[type="button"], input[type="submit"], a'
        );

        if (!control || control.closest(`#${CSS.escape(UI_ID)}`)) {
            return false;
        }

        const label = upper(
            control.tagName === "INPUT"
                ? control.value
                : control.textContent
        );

        return label === "SEARCH";
    }

    async function waitForSearchRefresh(token, timeoutMs = 8000) {
        const startedAt = Date.now();
        const staleNode = contextGate.staleTableNode;
        const staleFingerprint = contextGate.staleFingerprint;
        let sawTableDisappear = false;

        while (
            token === contextGate.watchToken &&
            Date.now() - startedAt < timeoutMs
        ) {
            const table = document.querySelector("#tablaEventos");

            if (!table) {
                sawTableDisappear = true;
                await sleep(50);
                continue;
            }

            const fingerprint = tableFingerprint();

            const refreshed = Boolean(
                sawTableDisappear ||
                (staleNode && table !== staleNode) ||
                fingerprint !== staleFingerprint ||
                (!staleNode && table)
            );

            if (refreshed) {
                contextGate.dirty = false;
                contextGate.searchRequested = false;
                contextGate.signature = currentFilterSignature();
                contextGate.staleFingerprint = fingerprint;
                contextGate.staleTableNode = table;

                console.log(
                    `${TAG} ✅ Search aplicado: tabla Rover refrescada para ` +
                    `${contextGate.signature}`
                );

                if (isCflSelection()) {
                    observeEditorContainer();
                    scheduleRender(0);
                } else {
                    removeUi();
                }

                return true;
            }

            await sleep(50);
        }

        if (token === contextGate.watchToken) {
            console.warn(
                `${TAG} ⏳ Search no produjo una transición detectable de ` +
                `#tablaEventos. La UI IBB permanece bloqueada para evitar ` +
                `mezclarla con resultados de otra liga.`
            );
        }

        return false;
    }

    function beginSearchRefreshWatch() {
        contextGate.searchRequested = true;
        contextGate.dirty = true;
        contextGate.signature = currentFilterSignature();
        contextGate.staleFingerprint = tableFingerprint();
        contextGate.staleTableNode =
            document.querySelector("#tablaEventos");

        const token = ++contextGate.watchToken;

        void waitForSearchRefresh(token).catch(error =>
            console.error(`${TAG} Search gate error`, error)
        );
    }

    function isCflView() {
        return Boolean(
            isCflSelection() &&
            !contextGate.dirty &&
            document.querySelector("#tablaEventos")
        );
    }

    // ============================================================
    // FECHA ROVER
    // ============================================================

    function normalizeDateInput(value) {
        const raw = clean(value);

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
        }

        let match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

        if (match) {
            const [, mm, dd, yyyy] = match;
            return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        }

        match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

        if (match) {
            const [, mm, dd, yyyy] = match;
            return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        }

        return "";
    }

    function getIsoDate() {
        for (const el of document.querySelectorAll('input[name="fecha"], input[id="fecha"]')) {
            const normalized = normalizeDateInput(el.value);
            if (normalized) {
                return normalized;
            }
        }

        return "";
    }

    function dateFromRow(row) {
        const globalIso = getIsoDate();

        if (globalIso) {
            return globalIso;
        }

        const content = clean(row?.getAttribute("data-content"));

        let match = content.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);

        if (match) {
            const [, dd, mm, yyyy] = match;
            return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        }

        match = content.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);

        if (match) {
            return match[0];
        }

        return "";
    }

    // ============================================================
    // EVENTOS ROVER
    // ============================================================

    function parseTeam(text) {
        const raw = clean(text);
        const match = raw.match(/^(\d+)\s+(.+)$/);

        if (!match) {
            return {
                roverCode: "",
                roverName: raw
            };
        }

        return {
            roverCode: match[1],
            roverName: clean(match[2])
        };
    }

    function parseRoverRow(row) {
        if (!row) return null;

        const cells = [...row.querySelectorAll("td")];

        if (cells.length < 3) {
            return null;
        }

        const ref = clean(cells[0].innerText).replace(/\D/g, "");

        if (!ref) {
            return null;
        }

        const away = parseTeam(cells[1].innerText);
        const home = parseTeam(cells[2].innerText);

        return {
            roverEventId: ref,
            date: dateFromRow(row),
            away,
            home,
            row
        };
    }

    function getCurrentRoverEvent() {
        if (!isCflView()) {
            return { valid: false, reason: "not_cfl" };
        }

        const container = document.querySelector("#resEditContainer");
        const editorId = clean(
            container?.querySelector('input[name="evento[]"]')?.value
        );

        if (!editorId) {
            return { valid: false, reason: "no_editor_event" };
        }

        const row =
            document.querySelector(`#tablaEventos tr[tkt="${CSS.escape(editorId)}"]`) ||
            [...document.querySelectorAll("#tablaEventos tr")].find(tr =>
                clean(tr.querySelector("td")?.innerText).replace(/\D/g, "") === editorId
            );

        if (!row) {
            return {
                valid: false,
                reason: "row_not_found",
                roverEventId: editorId
            };
        }

        const parsed = parseRoverRow(row);

        if (!parsed) {
            return {
                valid: false,
                reason: "invalid_row",
                roverEventId: editorId
            };
        }

        return {
            valid: parsed.roverEventId === editorId,
            reason: parsed.roverEventId === editorId ? "" : "identity_mismatch",
            ...parsed
        };
    }

    function getRoverEventById(roverEventId) {
        const id = clean(roverEventId);

        if (!id) {
            return {
                valid: false,
                reason: "no_rover_event_id"
            };
        }

        const row =
            document.querySelector(
                `#tablaEventos tr[tkt="${CSS.escape(id)}"]`
            ) ||
            [...document.querySelectorAll("#tablaEventos tr")].find(tr =>
                clean(tr.querySelector("td")?.innerText)
                    .replace(/\\D/g, "") === id
            );

        if (!row) {
            return {
                valid: false,
                reason: "row_not_found",
                roverEventId: id
            };
        }

        const parsed = parseRoverRow(row);

        if (!parsed) {
            return {
                valid: false,
                reason: "invalid_row",
                roverEventId: id
            };
        }

        return {
            valid: parsed.roverEventId === id,
            reason:
                parsed.roverEventId === id
                    ? ""
                    : "identity_mismatch",
            ...parsed
        };
    }

    function teamLine(rover) {
        return `${clean(rover?.away?.roverName)} @ ${clean(rover?.home?.roverName)}`;
    }

    // ============================================================
    // VÍNCULO MANUAL PERSISTENTE
    // ============================================================

    function linkKey(roverEventId) {
        return `${LINK_PREFIX}${String(roverEventId || "")}`;
    }

    function getManualLink(roverEventId) {
        const id = String(roverEventId || "");

        if (!id) return null;

        try {
            const raw = localStorage.getItem(linkKey(id));
            if (!raw) return null;

            const value = JSON.parse(raw);

            if (!value?.euroleagueEventId || !value?.seasonCode || !value?.gameCode) {
                return null;
            }

            return value;
        } catch (error) {
            console.warn(`${TAG} vínculo inválido para Rover #${id}`, error);
            return null;
        }
    }

    function saveManualLink(roverEventId, event) {
        const id = String(roverEventId || "");
        const euroleagueEventId = clean(event?.eventId);

        if (!id || !/^E\d{4}_\d+$/.test(euroleagueEventId)) {
            throw new Error("EuroLeague Event ID inválido.");
        }

        const roverDate =
            clean(getCurrentRoverEvent()?.date) ||
            clean(event?.date || "");

        const payload = {
            mode: "manual",
            roverEventId: id,
            euroleagueEventId,
            seasonCode: clean(event?.seasonCode),
            gameCode: Number(event?.gameCode),
            date: roverDate,
            homeName: clean(event?.home || ""),
            awayName: clean(event?.away || ""),
            tournament: "EuroLeague",
            timestamp: Number(event?.timestamp || 0) || 0,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(linkKey(id), JSON.stringify(payload));
        return payload;
    }

    function removeManualLink(roverEventId) {
        const id = String(roverEventId || "");
        if (!id) return;

        localStorage.removeItem(linkKey(id));
    }

    function clearAllLinks() {
        let removed = 0;

        for (let i = localStorage.length - 1; i >= 0; i -= 1) {
            const key = localStorage.key(i);

            if (key?.startsWith(LINK_PREFIX)) {
                localStorage.removeItem(key);
                removed += 1;
            }
        }

        console.log(`${TAG} vínculos IBB eliminados: ${removed}`);
        return removed;
    }

    // ============================================================
    // EUROLEAGUE HTTP / CALENDARIO
    // ============================================================

    const EL_BASE =
        "https://feeds.incrowdsports.com/provider/euroleague-feeds/v2/competitions/E";
    const EL_LIVE_BASE = "https://live.euroleague.net/api";
    const EL_TZ = "America/Santo_Domingo";

    const euroCache = {
        seasons: null,
        seasonsAt: 0,
        rounds: new Map(),
        day: new Map()
    };

    function gmGetText(url, timeout = 12000) {
        return new Promise((resolve, reject) => {
            const request = {
                method: "GET",
                url,
                headers: { Accept: "application/json, text/plain, */*" },
                timeout,
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(String(response.responseText || ""));
                    } else {
                        reject(new Error(`HTTP ${response.status} en ${url}`));
                    }
                },
                ontimeout: () => reject(new Error(`Timeout en ${url}`)),
                onerror: () => reject(new Error(`Error de red en ${url}`))
            };

            if (typeof GM_xmlhttpRequest === "function") {
                GM_xmlhttpRequest(request);
                return;
            }

            if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") {
                GM.xmlHttpRequest(request);
                return;
            }

            reject(new Error("GM_xmlhttpRequest no disponible."));
        });
    }

    async function gmGetJson(url) {
        const raw = await gmGetText(url);
        return JSON.parse(raw);
    }

    function unwrapEuro(payload, label) {
        if (payload?.data !== undefined) return payload.data;
        throw new Error(`${label}: respuesta EuroLeague inesperada.`);
    }

    function dateOnly(value) {
        const match = clean(value).match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : "";
    }

    function apiDateToRoverDate(iso) {
        try {
            const parts = new Intl.DateTimeFormat("en-CA", {
                timeZone: EL_TZ,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).formatToParts(new Date(iso));

            const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
            return `${map.year}-${map.month}-${map.day}`;
        } catch (_) {
            return "";
        }
    }

    async function fetchEuroSeasons() {
        if (
            euroCache.seasons &&
            Date.now() - euroCache.seasonsAt < 6 * 60 * 60 * 1000
        ) {
            return euroCache.seasons;
        }

        const data = unwrapEuro(
            await gmGetJson(`${EL_BASE}/seasons`),
            "SEASONS"
        );

        euroCache.seasons = Array.isArray(data) ? data : [];
        euroCache.seasonsAt = Date.now();

        return euroCache.seasons;
    }

    async function resolveEuroSeason(roverDate) {
        const seasons = await fetchEuroSeasons();

        const season = seasons.find(item => {
            const start = dateOnly(item?.startDate);
            const end = dateOnly(item?.endDate);

            return start && end && roverDate >= start && roverDate <= end;
        });

        if (!season?.code) {
            throw new Error(`No existe temporada EuroLeague para ${roverDate}.`);
        }

        return season;
    }

    async function fetchEuroRounds(seasonCode) {
        const cached = euroCache.rounds.get(seasonCode);

        if (cached && Date.now() - cached.at < 5 * 60 * 1000) {
            return cached.value;
        }

        const data = unwrapEuro(
            await gmGetJson(
                `${EL_BASE}/seasons/${encodeURIComponent(seasonCode)}/rounds`
            ),
            "ROUNDS"
        );

        const value = Array.isArray(data) ? data : [];
        euroCache.rounds.set(seasonCode, { at: Date.now(), value });

        return value;
    }

    function euroRoundContainsDate(round, roverDate) {
        const min = dateOnly(round?.minGameStartDate);
        const max = dateOnly(round?.maxGameStartDate);

        return Boolean(min && max && roverDate >= min && roverDate <= max);
    }

    async function fetchEuroRoundGames(seasonCode, round) {
        const phaseTypeCode = clean(round?.phaseTypeCode);
        const roundNumber = Number(round?.round);

        const url =
            `${EL_BASE}/seasons/${encodeURIComponent(seasonCode)}/games` +
            `?teamCode=&phaseTypeCode=${encodeURIComponent(phaseTypeCode)}` +
            `&roundNumber=${encodeURIComponent(roundNumber)}`;

        const data = unwrapEuro(await gmGetJson(url), "GAMES");
        return Array.isArray(data) ? data : [];
    }

    function sumOt(quarters) {
        return ["ot1", "ot2", "ot3", "ot4", "ot5"].reduce(
            (total, key) => total + (Number(quarters?.[key]) || 0),
            0
        );
    }

    function toCflShape(game, roverDate) {
        const seasonCode = clean(game?.season?.code);
        const gameCode = Number(game?.code);
        const identifier = clean(
            game?.identifier || `${seasonCode}_${gameCode}`
        );

        return {
            eventId: identifier,
            seasonCode,
            gameCode,
            away: clean(game?.away?.name),
            home: clean(game?.home?.name),
            timestamp: Math.floor(new Date(game?.date).getTime() / 1000),
            tournament: "EuroLeague",
            feedDate: roverDate,
            date: roverDate,
            sourceUrl:
                `${EL_BASE}/seasons/${encodeURIComponent(seasonCode)}/games/${gameCode}`,
            status: clean(game?.status),
            quarter: clean(game?.quarter),
            remainingTime: clean(game?.remainingTime),
            q1Away: Number(game?.away?.quarters?.q1) || 0,
            q2Away: Number(game?.away?.quarters?.q2) || 0,
            q3Away: Number(game?.away?.quarters?.q3) || 0,
            q4Away: Number(game?.away?.quarters?.q4) || 0,
            otAway: sumOt(game?.away?.quarters),
            awayTotal: Number(game?.away?.score) || 0,
            q1Home: Number(game?.home?.quarters?.q1) || 0,
            q2Home: Number(game?.home?.quarters?.q2) || 0,
            q3Home: Number(game?.home?.quarters?.q3) || 0,
            q4Home: Number(game?.home?.quarters?.q4) || 0,
            otHome: sumOt(game?.home?.quarters),
            homeTotal: Number(game?.home?.score) || 0,
            raw: game
        };
    }

    async function fetchEuroLeagueDay(roverDate, { useCache = true } = {}) {
        const cache = euroCache.day.get(roverDate);

        if (useCache && cache && Date.now() - cache.at < 10000) {
            return cache.value;
        }

        const season = await resolveEuroSeason(roverDate);
        const rounds = await fetchEuroRounds(season.code);
        const selectedRounds = rounds.filter(round =>
            euroRoundContainsDate(round, roverDate)
        );

        const settled = await Promise.allSettled(
            selectedRounds.map(round =>
                fetchEuroRoundGames(season.code, round)
            )
        );

        const events = [];

        for (const item of settled) {
            if (item.status !== "fulfilled") continue;

            for (const game of item.value) {
                if (apiDateToRoverDate(game?.date) !== roverDate) continue;
                events.push(toCflShape(game, roverDate));
            }
        }

        const unique = [...new Map(
            events.map(event => [event.eventId, event])
        ).values()].sort((a, b) => a.timestamp - b.timestamp);

        const value = {
            cflEvents: unique,
            allEvents: unique,
            excludedByDate: [],
            feedResults: [],
            roverDate
        };

        euroCache.day.set(roverDate, {
            at: Date.now(),
            value
        });

        console.log("");
        console.log("=== EUROLEAGUE / JUEGOS DEL DÍA ===");
        console.table(
            unique.map(event => ({
                ID: event.eventId,
                AWAY: event.away,
                HOME: event.home,
                FECHA: event.feedDate,
                ESTADO: event.status
            }))
        );

        return value;
    }

    async function fetchLinkedEuroEvent(rover, link) {
        const url =
            `${EL_BASE}/seasons/${encodeURIComponent(link.seasonCode)}` +
            `/games/${encodeURIComponent(link.gameCode)}`;

        const game = unwrapEuro(await gmGetJson(url), "GAME");

        if (
            clean(game?.identifier) !== clean(link.euroleagueEventId) ||
            Number(game?.code) !== Number(link.gameCode)
        ) {
            throw new Error("EuroLeague devolvió un juego diferente al vinculado.");
        }

        if (apiDateToRoverDate(game?.date) !== rover.date) {
            throw new Error("La fecha del juego vinculado ya no coincide con Rover.");
        }

        return toCflShape(game, rover.date);
    }

    async function fetchEuroBoxscore(link) {
        return gmGetJson(
            `${EL_LIVE_BASE}/Boxscore?gamecode=${encodeURIComponent(link.gameCode)}` +
            `&seasoncode=${encodeURIComponent(link.seasonCode)}`
        );
    }

    // ============================================================
    // NORMALIZACIÓN DE ESTADO / RESULTADOS
    // ============================================================

    function normalizeStatus(event) {
        const raw = clean(event?.status).toLowerCase();

        let normalized = "UNKNOWN";

        if (raw === "result") normalized = "FINAL";
        else if (raw === "live") normalized = "LIVE";
        else if (raw === "confirmed") normalized = "NOT_STARTED";
        else if (raw.includes("postpon")) normalized = "POSTPONED";
        else if (raw.includes("cancel")) normalized = "CANCELED";

        return {
            normalized,
            stageId: raw,
            stageTypeId: "",
            label: raw || "unknown"
        };
    }

    function normalizeLinkedGame(rover, event, link) {
        const status = normalizeStatus(event);

        return {
            roverEventId: rover.roverEventId,
            roverDate: rover.date,
            flashscoreEventId: event.eventId,
            linkMode: "MANUAL",
            linkSource: "EUROLEAGUE",
            sourceUrl: event.sourceUrl || "",
            event: {
                date: event.feedDate || rover.date,
                timestamp: event.timestamp,
                tournament: "EuroLeague",
                name: `${event.away} @ ${event.home}`
            },
            status,
            away: {
                name: event.away,
                q1: event.q1Away,
                q2: event.q2Away,
                q3: event.q3Away,
                q4: event.q4Away,
                ot: event.otAway,
                final: event.awayTotal
            },
            home: {
                name: event.home,
                q1: event.q1Home,
                q2: event.q2Home,
                q3: event.q3Home,
                q4: event.q4Home,
                ot: event.otHome,
                final: event.homeTotal
            },
            manualLink: link
        };
    }

    function validateTeamScore(team, side) {
        const values = [
            team?.q1,
            team?.q2,
            team?.q3,
            team?.q4,
            team?.ot,
            team?.final
        ];

        if (values.some(value => !Number.isFinite(Number(value)))) {
            return {
                ok: false,
                reason: `${side}_INVALID_SCORE`
            };
        }

        const periods =
            Number(team.q1) +
            Number(team.q2) +
            Number(team.q3) +
            Number(team.q4) +
            Number(team.ot);

        if (periods !== Number(team.final)) {
            return {
                ok: false,
                reason: `${side}_PERIOD_SUM_MISMATCH`,
                periods,
                final: team.final
            };
        }

        return { ok: true };
    }

    function validateGameScore(game) {
        const away = validateTeamScore(game.away, "AWAY");
        if (!away.ok) return away;

        const home = validateTeamScore(game.home, "HOME");
        if (!home.ok) return home;

        return { ok: true };
    }

    async function validateFinalBoxscore(game) {
        if (game.status.normalized !== "FINAL") {
            return { ok: true, skipped: true };
        }

        const box = await fetchEuroBoxscore(game.manualLink);

        if (box?.Live === true) {
            return { ok: false, reason: "BOXSCORE_STILL_LIVE" };
        }

        const rows = Array.isArray(box?.ByQuarter) ? box.ByQuarter : [];

        const normalizeName = value =>
            clean(value)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
                .replace(/[^A-Z0-9]+/g, " ")
                .trim();

        const find = name =>
            rows.find(row => normalizeName(row?.Team) === normalizeName(name));

        const away = find(game.away.name);
        const home = find(game.home.name);

        if (!away || !home) {
            return { ok: false, reason: "BOXSCORE_TEAM_NOT_FOUND" };
        }

        for (const [side, gameTeam, row] of [
            ["AWAY", game.away, away],
            ["HOME", game.home, home]
        ]) {
            for (const [key, boxKey] of [
                ["q1", "Quarter1"],
                ["q2", "Quarter2"],
                ["q3", "Quarter3"],
                ["q4", "Quarter4"]
            ]) {
                if (Number(gameTeam[key]) !== Number(row?.[boxKey])) {
                    return {
                        ok: false,
                        reason: `${side}_${key.toUpperCase()}_BOXSCORE_MISMATCH`
                    };
                }
            }
        }

        return { ok: true };
    }

    // ============================================================
    // PLAN DE ESCRITURA ROVER
    // T1 = AWAY / T2 = HOME
    // NO TOCA ESTADO
    // ============================================================

    function buildRoverResultPlan(game) {
        const eventId = clean(game?.roverEventId);

        return {
            eventId,
            editedId: `${eventId}-Edited`,
            scoreFields: [
                { id: `${eventId}T1Q1Basq`, label: "T1/AWAY Q1", value: game.away.q1 },
                { id: `${eventId}T1Q2Basq`, label: "T1/AWAY Q2", value: game.away.q2 },
                { id: `${eventId}T1Q3Basq`, label: "T1/AWAY Q3", value: game.away.q3 },
                { id: `${eventId}T1Q4Basq`, label: "T1/AWAY Q4", value: game.away.q4 },
                { id: `${eventId}T1OTBasq`, label: "T1/AWAY OT", value: game.away.ot || 0 },
                { id: `${eventId}T1TOTBasq`, label: "T1/AWAY F", value: game.away.final },

                { id: `${eventId}T2Q1Basq`, label: "T2/HOME Q1", value: game.home.q1 },
                { id: `${eventId}T2Q2Basq`, label: "T2/HOME Q2", value: game.home.q2 },
                { id: `${eventId}T2Q3Basq`, label: "T2/HOME Q3", value: game.home.q3 },
                { id: `${eventId}T2Q4Basq`, label: "T2/HOME Q4", value: game.home.q4 },
                { id: `${eventId}T2OTBasq`, label: "T2/HOME OT", value: game.home.ot || 0 },
                { id: `${eventId}T2TOTBasq`, label: "T2/HOME F", value: game.home.final }
            ]
        };
    }

    function verifyRoverResultControls(plan) {
        const container = document.querySelector("#resEditContainer");

        if (!container) {
            return { ok: false, reason: "NO_EDITOR_CONTAINER" };
        }

        const currentId = clean(
            container.querySelector('input[name="evento[]"]')?.value
        );

        if (currentId !== plan.eventId) {
            return {
                ok: false,
                reason: "EVENT_CHANGED",
                expected: plan.eventId,
                current: currentId
            };
        }

        const missing = plan.scoreFields
            .filter(item => !document.getElementById(item.id))
            .map(item => item.id);

        return missing.length
            ? { ok: false, reason: "MISSING_CONTROLS", missing }
            : { ok: true, container };
    }

    // ============================================================
    // LECTURA Y ACTUALIZACIÓN
    // ============================================================

    async function readLinkedGameFresh() {
        const rover = getCurrentRoverEvent();

        if (!rover?.valid) {
            console.warn(`${TAG} no hay evento IBB Rover activo.`);
            return null;
        }

        const link = getManualLink(rover.roverEventId);

        if (!link) {
            console.warn(`${TAG} Rover #${rover.roverEventId} no está vinculado.`);
            return null;
        }

        const event = await fetchLinkedEuroEvent(rover, link);
        const game = normalizeLinkedGame(rover, event, link);

        console.log("");
        console.log("=== EUROLEAGUE IBB / VÍNCULO ===");
        console.table([{
            ROVER_EVENT_ID: rover.roverEventId,
            EUROLEAGUE_EVENT_ID: link.euroleagueEventId,
            ROVER: teamLine(rover),
            EUROLEAGUE: `${game.away.name} @ ${game.home.name}`,
            ESTADO_API: game.status.normalized
        }]);

        console.log("");
        console.log("=== PARCIALES EUROLEAGUE ===");
        console.table([
            {
                SIDE: "AWAY",
                TEAM: game.away.name,
                Q1: game.away.q1,
                Q2: game.away.q2,
                Q3: game.away.q3,
                Q4: game.away.q4,
                OT: game.away.ot,
                F: game.away.final
            },
            {
                SIDE: "HOME",
                TEAM: game.home.name,
                Q1: game.home.q1,
                Q2: game.home.q2,
                Q3: game.home.q3,
                Q4: game.home.q4,
                OT: game.home.ot,
                F: game.home.final
            }
        ]);

        return game;
    }

    async function updateLinkedResult() {
        const startedAt = performance.now();

        console.log("==============================================");
        console.log(`EUROLEAGUE IBB RESULT UPDATE v${VERSION}`);
        console.log("==============================================");

        const game = await readLinkedGameFresh();

        if (!game) {
            setResultNoticeError("SIN DATOS / SIN VÍNCULO");
            return { ok: false, reason: "NO_GAME_DATA" };
        }

        const validation = validateGameScore(game);

        if (!validation.ok) {
            setResultNoticeError("DATOS EUROLEAGUE EN TRANSICIÓN");
            console.error(`${TAG} ⛔ no se modificó Rover:`, validation);

            return {
                ok: false,
                applied: false,
                reason: validation.reason,
                validation,
                game
            };
        }

        const finalValidation = await validateFinalBoxscore(game);

        if (!finalValidation.ok) {
            setResultNoticeError("FINAL NO VALIDADO");
            console.error(`${TAG} ⛔ Boxscore no validó el final:`, finalValidation);

            return {
                ok: false,
                applied: false,
                reason: finalValidation.reason,
                finalValidation,
                game
            };
        }

        const plan = buildRoverResultPlan(game);
        const verification = verifyRoverResultControls(plan);

        if (!verification.ok) {
            setResultNoticeError("NO SE PUDO LLENAR ROVER");
            console.error(`${TAG} ⛔ controles Rover no válidos:`, verification);

            return {
                ok: false,
                reason: verification.reason,
                verification,
                game
            };
        }

        const changes = [];

        for (const item of plan.scoreFields) {
            const result = setRoverFieldValue(
                document.getElementById(item.id),
                item.value
            );

            changes.push({
                CAMPO: item.id,
                DATO: item.label,
                ANTES: result.previous,
                EUROLEAGUE: item.value,
                CAMBIO: result.changed ? "SI" : "NO"
            });
        }

        const anyChanged = changes.some(item => item.CAMBIO === "SI");

        if (anyChanged) {
            const edited = document.getElementById(plan.editedId);

            if (edited) {
                setRoverFieldValue(edited, "1");
            }
        }

        const final = game.status.normalized === "FINAL";

        const notice = {
            className: final ? "is-final" : "is-live",
            text:
                `${final ? "FINAL" : game.status.label.toUpperCase()} · ` +
                `${game.away.final}-${game.home.final} · CARGADO ✓`,
            title:
                `${game.away.name} ${game.away.final} - ` +
                `${game.home.final} ${game.home.name}`
        };

        storeResultNotice(game.roverEventId, notice);
        setResultNotice(getUiRoot(), notice);

        console.log("");
        console.log("=== RESULTADO APLICADO A ROVER ===");
        console.table(changes);
        console.log(
            `${TAG} ESTADO intacto. NO se pulsó Guardar Resultados ni Procesar Tickets.`
        );

        return {
            ok: true,
            applied: true,
            game,
            plan,
            changes,
            changed: anyChanged,
            elapsedMs: Math.round(performance.now() - startedAt)
        };
    }

    // ============================================================
    // UI
    // ============================================================

    function installStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = STYLE_ID;

        /*
         * Copia deliberadamente la geometría/colores del panel Soccer
         * suministrado por el usuario:
         * - título azul
         * - input gris de 29 px
         * - dropdown absoluto blanco
         * - selección verde tenue
         * - Vincular verde
         * - ↻ morado
         * - × naranja
         */
        style.textContent = `
            #${UI_ID} {
                width: 100%;
                margin: 0 0 10px 0;
                position: relative;
                z-index: 9;
                font-family: Arial, Helvetica, sans-serif;
            }

            #${UI_ID} * {
                box-sizing: border-box;
            }

            #${UI_ID} .rs-fs-panel {
                display: grid;
                grid-template-columns: 32px minmax(0, 1fr);
                align-items: start;
                gap: 6px;
                width: 100%;
            }

            #${UI_ID} .rs-fs-title {
                width: 26px;
                height: 29px;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                padding: 0;
                margin: 0 0 0 6px;
                background: transparent;
                position: relative;
                z-index: 2;
                font-size: 12px;
                font-weight: 700;
                color: #1f6fe5;
                line-height: 29px;
                white-space: nowrap;
                user-select: none;
            }

            #${UI_ID} .rs-fs-main {
                min-width: 0;
                position: relative;
            }

            #${UI_ID} .rs-fs-search-row {
                display: grid;
                grid-template-columns: minmax(220px, 1fr) auto;
                gap: 4px;
                align-items: start;
                width: 100%;
            }

            #${UI_ID} .rs-fs-searchbox {
                position: relative;
                min-width: 0;
                width: 100%;
            }

            #${UI_ID} .rs-fs-filter {
                display: block;
                width: 100%;
                height: 29px;
                border: 1px solid #9f9f9f;
                border-radius: 0;
                background: #e8e8e8;
                color: #333;
                padding: 0 8px;
                font-size: 12px;
                line-height: 27px;
                outline: none;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.45);
            }

            #${UI_ID} .rs-fs-filter::placeholder {
                color: #9c9c9c;
            }

            #${UI_ID} .rs-fs-filter:focus {
                background: #ededed;
                border-color: #8c8c8c;
            }

            #${UI_ID} .rs-fs-list {
                display: none;
                position: absolute;
                top: calc(100% + 1px);
                left: 0;
                width: 100%;
                max-height: 360px;
                overflow-y: auto;
                background: #fff;
                border: 1px solid #d1d1d1;
                z-index: 9999;
            }

            #${UI_ID} .rs-fs-row {
                display: block;
                padding: 10px 9px;
                border-top: 1px solid #dcdcdc;
                background: #fff;
                color: #333;
                font-size: 12px;
                line-height: 1.2;
                cursor: pointer;
                user-select: none;
            }

            #${UI_ID} .rs-fs-row:first-child {
                border-top: 0;
            }

            #${UI_ID} .rs-fs-row:hover {
                background: #f3f3f3;
            }

            #${UI_ID} .rs-fs-row.is-selected {
                background: #ebfaf4;
                box-shadow: inset 3px 0 0 #00c191;            }

            #${UI_ID} .rs-fs-line {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            #${UI_ID} .rs-fs-btn {
                border: 1px solid transparent;
                border-radius: 0;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                line-height: 1;
                user-select: none;
            }

            #${UI_ID} .rs-fs-btn:disabled {
                opacity: .55;
                cursor: not-allowed;
            }

            #${UI_ID} .rs-fs-btn-link-main {
                min-width: 82px;
                height: 29px;
                padding: 0 10px;
                background: #00c191;
                border-color: #00c191;
                color: #fff;
            }

            #${UI_ID} .rs-fs-btn-link-main:hover:not(:disabled) {
                background: #00b086;
                border-color: #00b086;
            }

            #${UI_ID} .rs-fs-linked-inline {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 34px 22px;
                gap: 4px;
                align-items: center;
                width: 100%;
            }

            #${UI_ID} .rs-fs-pill {
                min-width: 0;
                height: 29px;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 0 10px;
                border: 1px solid #57b36a;
                background: #f1f6f1;
                color: #1c5e27;
                font-size: 12px;
                overflow: hidden;
            }

            #${UI_ID} .rs-fs-pill-main {
                min-width: 0;
                flex: 1 1 auto;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            #${UI_ID} .rs-fs-result-notice {
                flex: 0 0 auto;
                white-space: nowrap;
                color: #c62828;
                font-size: 11px;
                font-weight: 600;
            }

            #${UI_ID} .rs-fs-result-notice.is-live {
                color: #c62828;
            }

            #${UI_ID} .rs-fs-result-notice.is-final {
                color: #1c5e27;
            }

            #${UI_ID} .rs-fs-result-notice.is-error {
                color: #c62828;
            }

            #${UI_ID} .rs-fs-result-notice.is-pre {
                color: #607d8b;
            }

            #${UI_ID} .rs-fs-btn-refresh {
                width: 34px;
                height: 29px;
                padding: 0;
                background: #a88de4;
                border-color: #a88de4;
                color: #fff;
                font-size: 15px;
            }

            #${UI_ID} .rs-fs-btn-refresh:hover:not(:disabled) {
                background: #9a7cdb;
                border-color: #9a7cdb;
            }

            #${UI_ID} .rs-fs-btn-unlink {
                width: 22px;
                height: 22px;
                padding: 0;
                background: #f79a7a;
                border-color: #f79a7a;
                color: #fff;
                font-size: 14px;
            }

            #${UI_ID} .rs-fs-btn-unlink:hover:not(:disabled) {
                background: #f18663;
                border-color: #f18663;
            }

            #${UI_ID} .rs-fs-summary {
                grid-column: 1 / -1;
                display: none;
                padding: 4px 6px;
                border: 1px solid #edc6ca;
                background: #fff7f8;
                color: #9a3942;
                font-size: 11px;
                text-align: center;
            }

            #${UI_ID} .rs-fs-summary.is-visible {
                display: block;
            }

            #${UI_ID} .rs-fs-summary.is-warning {
                display: block;
                background: #fff3cd;
                border: 1px solid #f2c66d;
                color: #8a5a00;
            }

            #${UI_ID} .rs-fs-empty {
                padding: 8px 9px;
                background: #fff;
                color: #777;
                font-size: 11px;
            }

            @media (max-width: 780px) {
                #${UI_ID} .rs-fs-panel {
                    grid-template-columns: 34px minmax(0, 1fr);
                    gap: 6px;
                }

                #${UI_ID} .rs-fs-title {
                    width: 28px;
                    margin-left: 6px;
                }

                #${UI_ID} .rs-fs-btn-link-main {
                    min-width: 72px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function getUiRoot() {
        return document.getElementById(UI_ID);
    }

    function removeUi() {
        getUiRoot()?.remove();
        uiState.manualCandidates.clear();
        uiState.listExpanded = false;
        uiState.selectedEventId = "";
        uiState.filterValue = "";
        uiState.candidatesDate = "";
        uiState.lastLoadError = "";

        clearTimeout(uiState.pendingSafetyTimer);
        uiState.pendingSafetyTimer = 0;

        clearTimeout(uiState.collapseTimer);
        uiState.collapseTimer = 0;
    }

    function findUiAnchor(roverEventId) {
        const container = document.querySelector("#resEditContainer");

        if (!container) return null;

        const id = String(roverEventId || "");

        if (id) {
            const estado = container.querySelector(
                `#${CSS.escape(`${id}-Estado`)}`
            );

            const table = estado?.closest("table");

            if (table) {
                return table.closest(".table-responsive") || table;
            }

            const eventTable = [...container.querySelectorAll("table")].find(
                item => clean(item.innerText).includes(`#${id}`)
            );

            if (eventTable) {
                return eventTable.closest(".table-responsive") || eventTable;
            }
        }

        return container.querySelector("table") || null;
    }

    function ensureUiRoot(roverEventId) {
        const container = document.querySelector("#resEditContainer");

        if (!container) return null;

        let root = getUiRoot();

        if (!root || !container.contains(root)) {
            root = document.createElement("div");
            root.id = UI_ID;
        }

        root.dataset.roverEventId = String(roverEventId || "");

        const anchor = findUiAnchor(roverEventId);

        if (anchor && anchor.parentNode) {
            if (root.parentNode !== anchor.parentNode || root.nextSibling !== anchor) {
                anchor.parentNode.insertBefore(root, anchor);
            }
        } else if (!root.isConnected) {
            container.prepend(root);
        }

        return root;
    }

    function setUiBusy(root, busy) {
        if (!root) return;

        for (const button of root.querySelectorAll("button")) {
            button.disabled = Boolean(busy);
        }

        const input = root.querySelector('[data-role="filter"]');
        if (input) {
            input.disabled = Boolean(busy);
        }
    }

    /*
     * v1.0.12
     * La selección manual debe funcionar incluso si Rover todavía no ha
     * reconstruido #resEditContainer. No consultamos el editor activo para
     * seleccionar una fila: el panel ya conoce su Rover Event ID.
     */
    function selectCandidateInPlace(root, eventId) {
        const id = clean(eventId);

        if (
            !root ||
            !id ||
            !uiState.manualCandidates.has(id)
        ) {
            return false;
        }

        uiState.selectedEventId = id;
        uiState.listExpanded = true;

        for (const row of root.querySelectorAll(
            '[data-fs-action="pick-candidate"]'
        )) {
            row.classList.toggle(
                "is-selected",
                clean(row.dataset.eventId) === id
            );
        }

        const linkButton = root.querySelector(
            '[data-fs-action="manual-save"]'
        );

        if (linkButton) {
            linkButton.disabled = false;
            linkButton.dataset.eventId = id;
        }

        setSummary("");
        return true;
    }

    function rebuildUiRootForEvent(roverEventId) {
        const id = clean(roverEventId);
        const previous = getUiRoot();

        /*
         * Solo quitamos nuestro nodo. No tocamos el editor/tabla de Rover.
         * Esto reproduce la parte útil de la "reconstrucción" que antes se
         * conseguía manualmente haciendo click en el panel derecho.
         */
        previous?.remove();

        const root = ensureUiRoot(id);

        if (root) {
            root.dataset.roverEventId = id;
        }

        return root;
    }

    function getFilteredCandidates() {
        const query = upper(uiState.filterValue);

        const events = [...uiState.manualCandidates.values()];

        if (!query) {
            return events;
        }

        return events.filter(event => {
            const haystack = upper(
                [
                    event.away,
                    event.home,
                    manualCandidateLabel(event),
                    event.eventId,
                    event.tournament
                ].join(" ")
            );

            return haystack.includes(query);
        });
    }

    function scheduleListCollapse() {
        clearTimeout(uiState.collapseTimer);

        uiState.collapseTimer = setTimeout(() => {
            uiState.listExpanded = false;
            renderCurrent({ preserveSearchState: true }).catch(error =>
                console.error(`${TAG} collapse render error`, error)
            );
        }, 140);
    }

    function cancelListCollapse() {
        clearTimeout(uiState.collapseTimer);
        uiState.collapseTimer = 0;
    }

    async function expandList(rover, { forceLoad = false } = {}) {
        cancelListCollapse();
        uiState.listExpanded = true;

        const needsLoad =
            forceLoad ||
            uiState.candidatesDate !== rover.date ||
            !uiState.manualCandidates.size;

        if (needsLoad && !uiState.loadingCandidates) {
            await loadManualCandidates(getUiRoot(), rover, {
                force: forceLoad
            });
            return;
        }

        await renderCurrent({ preserveSearchState: true });
    }

    function linkedMainLine(link) {
        const away = clean(link?.awayName);
        const home = clean(link?.homeName);
        const id = clean(link?.euroleagueEventId);

        let eventText =
            away && home
                ? `${away} @ ${home}`
                : `EuroLeague #${id}`;

        const time = link?.timestamp
            ? formatEventTime(link.timestamp)
            : "";

        const date = clean(link?.date);

        const suffix = [time, date].filter(Boolean).join(" ");

        if (suffix) {
            eventText += ` (${suffix})`;
        }

        return eventText;
    }

    function getStoredResultNotice(roverEventId) {
        return uiState.lastNoticeByEvent[
            String(roverEventId || "")
        ] || null;
    }

    function storeResultNotice(roverEventId, notice) {
        const id = String(roverEventId || "");

        if (!id) {
            return;
        }

        if (!notice?.text) {
            delete uiState.lastNoticeByEvent[id];
            return;
        }

        uiState.lastNoticeByEvent[id] = {
            className: clean(notice.className || ""),
            text: clean(notice.text || ""),
            title: clean(notice.title || "")
        };
    }

    function clearStoredResultNotice(roverEventId) {
        delete uiState.lastNoticeByEvent[
            String(roverEventId || "")
        ];
    }

    function renderLinked(root, rover, link) {
        const mainLine = linkedMainLine(link);
        const storedNotice = getStoredResultNotice(
            rover.roverEventId
        );

        const noticeClass = storedNotice?.className
            ? ` ${escapeHtml(storedNotice.className)}`
            : "";

        const noticeTitle = storedNotice?.title
            ? ` title="${escapeHtml(storedNotice.title)}"`
            : "";

        const noticeText = storedNotice?.text
            ? escapeHtml(storedNotice.text)
            : "";

        root.innerHTML = `
            <div class="rs-fs-panel">
                <div class="rs-fs-title">IBB</div>

                <div class="rs-fs-main">
                    <div class="rs-fs-linked-inline">
                        <div class="rs-fs-pill"
                             title="${escapeHtml(mainLine)}">
                            <span class="rs-fs-pill-main">
                                ${escapeHtml(mainLine)}
                            </span>
                            <span class="rs-fs-result-notice${noticeClass}"
                                  data-role="result-notice"${noticeTitle}>${noticeText}</span>
                        </div>

                        <button type="button"
                                class="rs-fs-btn rs-fs-btn-refresh"
                                data-fs-action="update-result"
                                title="Actualizar resultado desde EuroLeague">
                            ↻
                        </button>

                        <button type="button"
                                class="rs-fs-btn rs-fs-btn-unlink"
                                data-fs-action="unlink"
                                title="Desvincular">
                            ×
                        </button>
                    </div>
                </div>

                <div class="rs-fs-summary"
                     data-role="summary"></div>
            </div>
        `;
    }

    function renderUnlinked(root, rover) {
        /*
         * renderCurrent reemplaza el HTML del panel. Conservamos el foco del
         * buscador para que escribir no lo pierda en cada tecla.
         */
        const restoreFilterFocus = Boolean(
            document.activeElement?.matches?.(
                `#${CSS.escape(UI_ID)} [data-role="filter"]`
            )
        );

        const filtered = getFilteredCandidates();

        if (
            uiState.selectedEventId &&
            !filtered.some(event => event.eventId === uiState.selectedEventId)
        ) {
            uiState.selectedEventId = "";
        }

        const listHtml = uiState.loadingCandidates
            ? `<div class="rs-fs-empty">Buscando juegos EuroLeague...</div>`
            : uiState.lastLoadError
                ? `<div class="rs-fs-empty">${escapeHtml(uiState.lastLoadError)}</div>`
                : filtered.length
                    ? filtered.map(event => {
                        const selectedClass =
                            event.eventId === uiState.selectedEventId
                                ? " is-selected"
                                : "";

                        const line = `${event.away} @ ${event.home}`;

                        return `
                            <div class="rs-fs-row${selectedClass}"
                                 data-fs-action="pick-candidate"
                                 data-event-id="${escapeHtml(event.eventId)}"
                                 title="${escapeHtml(manualCandidateLabel(event))}">
                                <div class="rs-fs-line">
                                    ${escapeHtml(line)}
                                </div>
                            </div>
                        `;
                    }).join("")
                    : `<div class="rs-fs-empty">No hay juegos EuroLeague para mostrar.</div>`;

        root.innerHTML = `
            <div class="rs-fs-panel">
                <div class="rs-fs-title">IBB</div>

                <div class="rs-fs-main">
                    <div class="rs-fs-search-row"
                         data-role="search">
                        <div class="rs-fs-searchbox">
                            <input type="text"
                                   class="rs-fs-filter"
                                   data-role="filter"
                                   value="${escapeHtml(uiState.filterValue)}"
                                   placeholder="Buscar partido..."
                                   autocomplete="off">

                            <div class="rs-fs-list"
                                 data-role="list"
                                 style="display:${uiState.listExpanded ? "block" : "none"};">
                                ${uiState.listExpanded ? listHtml : ""}
                            </div>
                        </div>

                        <button type="button"
                                class="rs-fs-btn rs-fs-btn-link-main"
                                data-fs-action="manual-save"
                                data-event-id="${escapeHtml(uiState.selectedEventId)}"
                                ${uiState.selectedEventId ? "" : "disabled"}>
                            Vincular
                        </button>
                    </div>
                </div>

                <div class="rs-fs-summary"
                     data-role="summary"></div>
            </div>
        `;

        requestAnimationFrame(() => {
            if (!restoreFilterFocus) {
                return;
            }

            const input = root.querySelector('[data-role="filter"]');

            if (input) {
                try {
                    input.focus({ preventScroll: true });
                    input.setSelectionRange(
                        input.value.length,
                        input.value.length
                    );
                } catch (_) {}
            }
        });
    }

    function setSummary(message, {
        warning = false
    } = {}) {
        const summary = getUiRoot()?.querySelector('[data-role="summary"]');

        if (!summary) {
            return;
        }

        const text = clean(message);

        summary.textContent = text;
        summary.classList.toggle("is-visible", Boolean(text));
        summary.classList.toggle(
            "is-warning",
            Boolean(text) && warning
        );
    }

    function setResultNotice(root, notice) {
        const element = root?.querySelector('[data-role="result-notice"]');

        if (!element) return;

        element.className = "rs-fs-result-notice";

        if (!notice?.text) {
            element.textContent = "";
            element.removeAttribute("title");
            return;
        }

        if (notice.className) {
            element.classList.add(notice.className);
        }

        element.textContent = notice.text;

        if (notice.title) {
            element.title = notice.title;
        }
    }

    function setResultNoticeError(message) {
        const root = getUiRoot();

        if (root?.querySelector('[data-role="result-notice"]')) {
            setResultNotice(root, {
                className: "is-error",
                text: clean(message || "ERROR EUROLEAGUE")
            });
            return;
        }

        setSummary(message || "ERROR EUROLEAGUE", {
            warning: true
        });
    }

    function buildGameProgressNotice(game) {
        const status = game?.status?.normalized;

        if (status === "FINAL") {
            return {
                className: "is-final",
                text: `FINAL - ${game.away.final}-${game.home.final}`,
                title: `${game.away.name} @ ${game.home.name}`
            };
        }

        if (status === "HALFTIME") {
            return {
                className: "is-live",
                text:
                    `HALFTIME - ${firstHalfTotal(game.away)}-${firstHalfTotal(game.home)}`,
                title: `${game.away.name} @ ${game.home.name}`
            };
        }

        if (status === "LIVE") {
            return {
                className: "is-live",
                text:
                    `LIVE - ${game.away.final}-${game.home.final}`,
                title: `${game.away.name} @ ${game.home.name}`
            };
        }

        if (status === "NOT_STARTED") {
            return {
                className: "is-pre",
                text: "No iniciado",
                title: `${game.away.name} @ ${game.home.name}`
            };
        }

        if (["POSTPONED", "CANCELED", "INTERRUPTED"].includes(status)) {
            return {
                className: "is-error",
                text: game.status.label.toUpperCase(),
                title: `${game.away.name} @ ${game.home.name}`
            };
        }

        return {
            className: "is-pre",
            text: game.status.label,
            title: `${game.away.name} @ ${game.home.name}`
        };
    }

    function setResultNoticeForGame(game) {
        const roverEventId = String(
            game?.roverEventId || ""
        );

        const notice = buildGameProgressNotice(game);

        /*
         * Primero persistimos el texto. Si Rover reconstruye el editor justo
         * después, renderLinked() podrá restaurarlo inmediatamente.
         */
        storeResultNotice(roverEventId, notice);

        const root = getUiRoot();

        if (
            !root ||
            root.dataset.roverEventId !== roverEventId
        ) {
            return;
        }

        setResultNotice(root, notice);
    }

    function formatEventTime(timestamp) {
        if (!Number.isFinite(Number(timestamp)) || Number(timestamp) <= 0) {
            return "";
        }

        try {
            return new Intl.DateTimeFormat("en-US", {
                timeZone: "America/Santo_Domingo",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }).format(new Date(Number(timestamp) * 1000));
        } catch (_) {
            return "";
        }
    }

    function manualCandidateLabel(event) {
        const time = formatEventTime(event.timestamp);

        return (
            `${event.away} @ ${event.home}` +
            `${time ? ` — ${time}` : ""}` +
            ` — FS #${event.eventId}`
        );
    }

    async function loadManualCandidates(root, rover, {
        force = false
    } = {}) {
        if (uiState.loadingCandidates) {
            return;
        }

        uiState.loadingCandidates = true;
        uiState.lastLoadError = "";

        await renderCurrent({
            preserveSearchState: true
        });

        try {
            const day = await fetchEuroLeagueDay(
                rover.date,
                { useCache: !force }
            );

            /*
             * v1.0.12
             * Antes se exigía que getCurrentRoverEvent() coincidiera con el
             * panel. Tras desvincular, Rover puede dejar el editor central en
             * un estado intermedio hasta volver a seleccionar la fila derecha.
             * Para buscar/vincular eso no es necesario: basta con que el panel
             * siga perteneciendo a un evento Rover que existe en #tablaEventos.
             */
            const liveRoot = getUiRoot();
            const panelRover = getRoverEventById(
                rover.roverEventId
            );

            if (
                !liveRoot ||
                clean(liveRoot.dataset.roverEventId) !==
                    clean(rover.roverEventId) ||
                !panelRover?.valid
            ) {
                return;
            }

            uiState.manualCandidates.clear();

            for (const event of day.cflEvents) {
                uiState.manualCandidates.set(
                    String(event.eventId),
                    event
                );
            }

            uiState.candidatesDate = rover.date;

            if (
                uiState.selectedEventId &&
                !uiState.manualCandidates.has(uiState.selectedEventId)
            ) {
                uiState.selectedEventId = "";
            }
        } catch (error) {
            console.error(`${TAG} error cargando juegos CFL:`, error);
            uiState.lastLoadError =
                error?.message || "No se pudieron cargar los juegos CFL.";
        } finally {
            uiState.loadingCandidates = false;

            await renderCurrent({
                preserveSearchState: true
            });
        }
    }

    async function renderCurrent({
        preserveSearchState = false
    } = {}) {
        const seq = ++uiState.renderSeq;

        if (!isCflView()) {
            removeUi();
            return null;
        }

        const rover = getCurrentRoverEvent();

        if (!rover?.valid) {
            removeUi();
            return rover;
        }

        const previousEditorId = uiState.lastEditorId;
        uiState.lastEditorId = rover.roverEventId;

        if (
            !preserveSearchState &&
            previousEditorId &&
            previousEditorId !== rover.roverEventId
        ) {
            uiState.listExpanded = false;
            uiState.selectedEventId = "";
            uiState.filterValue = "";
            uiState.candidatesDate = "";
            uiState.manualCandidates.clear();
            uiState.lastLoadError = "";
        }

        if (seq !== uiState.renderSeq) {
            return null;
        }

        const root = ensureUiRoot(rover.roverEventId);

        if (!root) {
            return null;
        }

        const link = getManualLink(rover.roverEventId);

        if (link) {
            uiState.listExpanded = false;
            renderLinked(root, rover, link);
        } else {
            renderUnlinked(root, rover);
        }

        return {
            mode: link ? "manual" : "unlinked",
            rover,
            link
        };
    }

    function scheduleRender(delay = 80) {
        clearTimeout(uiState.renderTimer);

        uiState.renderTimer = setTimeout(() => {
            renderCurrent().catch(error =>
                console.error(`${TAG} render error`, error)
            );
        }, delay);
    }

    async function onUiClick(event) {
        const button = event.target.closest("[data-fs-action]");

        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.fsAction;
        const root = getUiRoot();

        if (!root) {
            return;
        }

        /*
         * v1.0.10
         * En días con varios eventos Rover, el editor puede reconstruirse o
         * cambiar de evento entre "seleccionar candidato" y "Vincular".
         * El panel fue creado para un Rover Event ID concreto, así que ese ID
         * es la referencia autoritativa para las acciones de vinculación.
         */
        const panelRoverEventId = clean(
            root.dataset.roverEventId
        );

        const currentRover = getCurrentRoverEvent();
        const panelRover = getRoverEventById(
            panelRoverEventId
        );

        console.log(`${TAG} UI action: ${action}`, {
            panelRoverEventId,
            currentRoverEventId:
                currentRover?.roverEventId || "",
            currentValid: Boolean(currentRover?.valid),
            panelValid: Boolean(panelRover?.valid)
        });

        if (!panelRoverEventId) {
            return;
        }

        /*
         * Para seleccionar/vincular/desvincular usamos el evento del panel.
         * Para escribir resultados seguimos exigiendo que el editor activo
         * corresponda exactamente a ese mismo evento.
         */
        const rover =
            panelRover?.valid
                ? panelRover
                : currentRover;

        if (action === "pick-candidate") {
            const eventId = clean(button.dataset.eventId);

            if (!selectCandidateInPlace(root, eventId)) {
                setSummary("El juego seleccionado ya no está disponible.", {
                    warning: true
                });
            }

            return;
        }

        if (action === "manual-save") {
            /*
             * Toma el ID desde tres fuentes, en este orden:
             * 1) estado interno,
             * 2) botón Vincular,
             * 3) fila visualmente seleccionada.
             * Esto evita depender de un único estado si Rover tocó el DOM.
             */
            const selectedRow = root.querySelector(
                '[data-fs-action="pick-candidate"].is-selected'
            );

            const fsId = clean(
                uiState.selectedEventId ||
                button.dataset.eventId ||
                selectedRow?.dataset?.eventId
            );

            if (!fsId) {
                setSummary("Primero selecciona un juego de la lista.", {
                    warning: true
                });
                return;
            }

            const candidate = uiState.manualCandidates.get(fsId);

            if (!candidate) {
                setSummary(
                    "El juego seleccionado ya no está disponible. Recarga la lista.",
                    { warning: true }
                );
                return;
            }

            /*
             * Guardar SIEMPRE contra el Rover Event ID al que pertenece el
             * panel, no contra un editor activo que pudo cambiar por AJAX.
             */
            saveManualLink(
                panelRoverEventId,
                candidate
            );

            console.log(
                `${TAG} ✅ vínculo guardado`,
                {
                    roverEventId: panelRoverEventId,
                    flashscoreEventId: fsId,
                    game: `${candidate.away} @ ${candidate.home}`
                }
            );

            uiState.listExpanded = false;
            uiState.selectedEventId = "";
            uiState.filterValue = "";
            setSummary("");

            await renderCurrent({
                preserveSearchState: true
            });

            return;
        }

        if (action === "unlink") {
            removeManualLink(panelRoverEventId);
            clearStoredResultNotice(panelRoverEventId);

            uiState.listExpanded = true;
            uiState.selectedEventId = "";
            uiState.filterValue = "";
            uiState.lastLoadError = "";

            const roverForPanel = getRoverEventById(
                panelRoverEventId
            );

            /*
             * No dependemos de que Rover vuelva a crear #resEditContainer.
             * Recreamos solamente nuestra barra y la dejamos lista para
             * seleccionar otro juego inmediatamente.
             */
            const freshRoot = rebuildUiRootForEvent(
                panelRoverEventId
            );

            if (freshRoot && roverForPanel?.valid) {
                renderUnlinked(
                    freshRoot,
                    roverForPanel
                );

                const needsCandidates =
                    uiState.candidatesDate !== roverForPanel.date ||
                    !uiState.manualCandidates.size;

                if (needsCandidates) {
                    await loadManualCandidates(
                        freshRoot,
                        roverForPanel
                    );
                }
            } else {
                await renderCurrent({
                    preserveSearchState: true
                });
            }

            return;
        }

        if (action === "update-result") {
            if (
                !currentRover?.valid ||
                currentRover.roverEventId !== panelRoverEventId
            ) {
                setSummary(
                    "Selecciona nuevamente este evento Rover antes de actualizar el resultado.",
                    { warning: true }
                );
                return;
            }

            const link = getManualLink(
                panelRoverEventId
            );

            if (!link) {
                setSummary("No hay un juego vinculado.", {
                    warning: true
                });
                return;
            }

            setUiBusy(root, true);

            setResultNotice(root, {
                className: "is-pre",
                text: "Actualizando..."
            });

            try {
                await updateLinkedResult();
            } catch (error) {
                console.error(`${TAG} update error`, error);
                setResultNoticeError(
                    error.message || "ERROR EUROLEAGUE"
                );
            } finally {
                setUiBusy(root, false);
            }
        }
    }

    function onUiChange(event) {
        const root = getUiRoot();
        const rover = getCurrentRoverEvent();

        if (!root || !rover?.valid) return;

        if (event.target.matches('[data-role="filter"]')) {
            uiState.filterValue = event.target.value || "";
            uiState.listExpanded = true;

            const filtered = getFilteredCandidates();

            if (                uiState.selectedEventId &&
                !filtered.some(
                    event => event.eventId === uiState.selectedEventId
                )
            ) {
                uiState.selectedEventId = "";
            }

            renderCurrent({
                preserveSearchState: true
            }).catch(error =>
                console.error(`${TAG} filter render error`, error)
            );
        }
    }

    // ============================================================
    // OBSERVERS / BOOT
    // ============================================================

    function observeEditorContainer() {
        const container = document.querySelector("#resEditContainer");

        if (!container) {
            return false;
        }

        if (
            uiState.observedContainer === container &&
            uiState.containerObserver
        ) {
            return true;
        }

        uiState.containerObserver?.disconnect();

        uiState.observedContainer = container;

        uiState.containerObserver = new MutationObserver(mutations => {
            /*
             * IMPORTANTE:
             * La barra CFL vive dentro de #resEditContainer. Sus propios
             * renderizados también generan childList mutations. Si reaccionamos
             * a ellas, renderCurrent() destruye inmediatamente el panel manual,
             * notices y demás controles.
             *
             * Ignoramos cualquier batch compuesto exclusivamente por cambios
             * dentro de #rs-fs-cfl-ui.
             */
            const onlyOwnUiMutations = mutations.length > 0 && mutations.every(mutation => {
                const target =
                    mutation.target?.nodeType === Node.ELEMENT_NODE
                        ? mutation.target
                        : mutation.target?.parentElement;

                return Boolean(
                    target &&
                    (
                        target.id === UI_ID ||
                        target.closest?.(`#${CSS.escape(UI_ID)}`)
                    )
                );
            });

            if (onlyOwnUiMutations) {
                return;
            }

            if (!isCflView()) {
                removeUi();
                return;
            }

            const editorId = clean(
                container.querySelector('input[name="evento[]"]')?.value
            );

            /*
             * Mientras Rover muestra "Loading..." todavía no existe el editor
             * real. Esperamos a que aparezca input[name="evento[]"].
             */
            if (!editorId) {
                return;
            }

            const root = getUiRoot();

            /*
             * Solo renderizamos cuando cambió realmente el evento, Rover
             * reemplazó la UI, o la barra quedó asociada a otro Event ID.
             */
            if (
                editorId !== uiState.lastEditorId ||
                !root ||
                root.dataset.roverEventId !== editorId ||
                !container.contains(root)
            ) {
                uiState.lastEditorId = editorId;
                scheduleRender(0);
            }
        });

        uiState.containerObserver.observe(container, {
            childList: true,
            subtree: true
        });

        return true;
    }

    function installGlobalListeners() {
        /*
         * Delegación global porque Rover reemplaza partes del DOM por AJAX.
         */

        /*
         * v1.0.12
         * Capturamos la selección en pointerdown, antes del click. De esta
         * forma, aunque Rover tenga handlers que reconstruyan el editor entre
         * pointerdown y click, el candidato ya quedó seleccionado.
         */
        document.addEventListener(
            "pointerdown",
            event => {
                const target = event.target;

                if (!(target instanceof Element)) {
                    return;
                }

                const row = target.closest(
                    `#${CSS.escape(UI_ID)} [data-fs-action="pick-candidate"]`
                );

                if (!row) {
                    return;
                }

                const root = getUiRoot();

                if (
                    !root ||
                    !root.contains(row)
                ) {
                    return;
                }

                const eventId = clean(row.dataset.eventId);

                if (selectCandidateInPlace(root, eventId)) {
                    /*
                     * Impide que un listener de Rover use este pointerdown para
                     * seleccionar/reconstruir otra cosa debajo del dropdown.
                     */
                    event.stopImmediatePropagation();
                }
            },
            true
        );

        document.addEventListener(
            "click",
            event => {
                const target = event.target;

                if (!(target instanceof Element)) {
                    return;
                }

                const uiAction = target.closest(
                    `#${CSS.escape(UI_ID)} [data-fs-action]`
                );

                if (uiAction) {
                    void onUiClick(event).catch(error => {
                        console.error(`${TAG} UI click error`, error);
                        setResultNoticeError(
                            error?.message || "ERROR DE INTERFAZ"
                        );
                    });
                    return;
                }

                /*
                 * El Search principal confirma que Rover debe cargar de verdad
                 * los filtros actualmente seleccionados. Se captura ANTES de
                 * comprobar isCflView(), porque durante el gate dirty=true.
                 */
                if (isMainSearchButton(target)) {
                    beginSearchRefreshWatch();
                    removeUi();
                    return;
                }

                if (!isCflView()) {
                    return;
                }

                const row = target.closest("#tablaEventos tr");

                if (row) {
                    setTimeout(() => {
                        observeEditorContainer();
                        scheduleRender(80);
                    }, 50);
                }
            },
            true
        );

        document.addEventListener(
            "input",
            event => {
                const target = event.target;

                if (
                    target instanceof Element &&
                    target.matches(
                        `#${CSS.escape(UI_ID)} [data-role="filter"]`
                    )
                ) {
                    onUiChange(event);
                }
            },
            true
        );

        document.addEventListener(
            "focusin",
            event => {
                const target = event.target;

                if (
                    !(target instanceof Element) ||
                    !target.matches(
                        `#${CSS.escape(UI_ID)} [data-role="filter"]`
                    )
                ) {
                    return;
                }

                const rover = getCurrentRoverEvent();

                if (rover?.valid && !getManualLink(rover.roverEventId)) {
                    void expandList(rover).catch(error =>
                        console.error(`${TAG} expand error`, error)
                    );
                }
            },
            true
        );

        document.addEventListener(
            "mouseover",
            event => {
                const target = event.target;

                if (!(target instanceof Element)) {
                    return;
                }

                if (
                    target.matches(
                        `#${CSS.escape(UI_ID)} [data-role="filter"]`
                    )
                ) {
                    const rover = getCurrentRoverEvent();

                    if (
                        rover?.valid &&
                        !getManualLink(rover.roverEventId)
                    ) {
                        void expandList(rover).catch(error =>
                            console.error(`${TAG} hover expand error`, error)
                        );
                    }
                }

                if (target.closest(`#${CSS.escape(UI_ID)}`)) {
                    cancelListCollapse();
                }
            },
            true
        );

        document.addEventListener(
            "mouseout",
            event => {
                const target = event.target;

                if (!(target instanceof Element)) {
                    return;
                }

                const root = target.closest(`#${CSS.escape(UI_ID)}`);

                if (!root) {
                    return;
                }

                const next = event.relatedTarget;

                if (
                    !(next instanceof Node) ||
                    !root.contains(next)
                ) {
                    const rover = getCurrentRoverEvent();

                    if (
                        rover?.valid &&
                        !getManualLink(rover.roverEventId)
                    ) {
                        scheduleListCollapse();
                    }
                }
            },
            true
        );

        document.addEventListener(
            "change",
            event => {
                const target = event.target;

                if (!(target instanceof Element)) {
                    return;
                }

                if (isFilterControl(target)) {
                    /*
                     * Los selects cambian primero; la tabla NO. Bloqueamos la
                     * UI hasta que el usuario pulse Search y Rover refresque.
                     */
                    markFiltersDirty();
                }
            },
            true
        );
    }

    function startPoll() {
        clearInterval(uiState.pollTimer);

        uiState.pollTimer = setInterval(() => {
            /*
             * Nunca revivir la barra mientras CATEGORY/LEAGUE/DATE hayan
             * cambiado pero Search todavía no haya cargado la tabla nueva.
             */
            if (contextGate.dirty) {
                if (getUiRoot()) {
                    removeUi();
                }
                uiState.active = false;
                return;
            }

            const active = isCflView();

            if (!active) {
                if (uiState.active) {
                    uiState.active = false;
                    removeUi();
                }

                return;
            }

            uiState.active = true;
            observeEditorContainer();

            const editorId = clean(
                document.querySelector(
                    '#resEditContainer input[name="evento[]"]'
                )?.value
            );

            if (editorId && editorId !== uiState.lastEditorId) {
                uiState.lastEditorId = editorId;
                scheduleRender(40);
            }

            const root = getUiRoot();

            if (editorId && (!root || root.dataset.roverEventId !== editorId)) {
                scheduleRender(40);
            }
        }, 700);
    }

    function boot() {
        /*
         * Al instalarse en una página ya cargada tomamos el estado actual
         * como baseline. A partir del primer cambio de filtro entra el gate.
         */
        contextGate.signature = currentFilterSignature();
        contextGate.staleFingerprint = tableFingerprint();
        contextGate.staleTableNode =
            document.querySelector("#tablaEventos");

        installStyles();
        installGlobalListeners();
        observeEditorContainer();
        startPoll();
        scheduleRender(120);

        expose("__RS_EUROLEAGUE_IBB", {
            VERSION,
            isCflSelection,
            isCflView,
            contextGate,
            currentFilterSignature,
            tableFingerprint,
            getCurrentRoverEvent,
            getRoverEventById,
            fetchFlashscoreDay,
            getManualLink,
            saveManualLink,
            getStoredResultNotice,
            clearStoredResultNotice,
            removeManualLink,
            clearAllLinks,
            readLinkedGameFresh,
            updateLinkedResult,
            renderCurrent
        });

        console.log(
            `${TAG} v${VERSION} instalado. ` +
            `Base CFL v1.0.12: vinculación manual + ↻ EuroLeague, sin tocar ESTADO.`
        );
    }

    boot();
})();