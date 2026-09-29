// ==UserScript==
// @name         Rs - EuroLeague IBB Resultados
// @namespace    https://roversport.net/
// @version      0.1.1
// @description  EuroLeague / IBB: vinculación manual tipo CFL y actualización manual de Q1-Q4/OT/F desde la fuente oficial de EuroLeague.
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

    const VERSION = "0.1.1";
    const TAG = "[EuroLeague IBB]";

    const UI_ID = "rs-euroleague-ibb-ui";
    const STYLE_ID = "rs-euroleague-ibb-style";
    const LINK_PREFIX = "rs_euroleague_ibb_link_v1_";
    const TIME_ZONE = "America/Santo_Domingo";

    const FEED_BASE =
        "https://feeds.incrowdsports.com/provider/euroleague-feeds/v2/competitions/E";
    const LIVE_BASE = "https://live.euroleague.net/api";

    const CACHE = {
        seasons: null,
        seasonsSavedAt: 0,
        roundsBySeason: new Map(),
        roundGames: new Map()
    };

    const CACHE_TTL = {
        seasons: 6 * 60 * 60 * 1000,
        rounds: 5 * 60 * 1000,
        games: 10 * 1000
    };

    const uiState = {
        renderSeq: 0,
        renderTimer: 0,
        pollTimer: 0,
        observedContainer: null,
        containerObserver: null,
        active: false,
        lastEditorId: "",
        listExpanded: false,
        collapseTimer: 0,
        selectedEventId: "",
        filterValue: "",
        candidatesDate: "",
        loadingCandidates: false,
        lastLoadError: "",
        restoringFilterFocus: false,
        manualCandidates: new Map(),
        lastNoticeByEvent: Object.create(null)
    };

    /*
     * Rover no actualiza #tablaEventos al cambiar filtros hasta pulsar Search.
     * El gate evita mostrar/vincular EuroLeague encima de una tabla vieja.
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

    function isVisibleElement(element) {
        if (!(element instanceof Element)) return false;

        try {
            const style = getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden") {
                return false;
            }

            return element.getClientRects().length > 0;
        } catch (_) {
            return true;
        }
    }

    function pickBestElement(selector) {
        const nodes = [...document.querySelectorAll(selector)];
        if (!nodes.length) return null;

        const visible = nodes.filter(isVisibleElement);
        return visible.at(-1) || nodes.at(-1) || null;
    }

    function getEventsTable() {
        const tables = [...document.querySelectorAll("#tablaEventos")];
        if (!tables.length) return null;

        const visible = tables.filter(isVisibleElement);
        return visible.at(-1) || tables.at(-1) || null;
    }

    function getEditorContainer() {
        const containers = [...document.querySelectorAll("#resEditContainer")];
        if (!containers.length) return null;

        const withEvent = containers.filter(container =>
            container.querySelector('input[name="evento[]"]')
        );
        const visibleWithEvent = withEvent.filter(isVisibleElement);

        return (
            visibleWithEvent.at(-1) ||
            withEvent.at(-1) ||
            containers.filter(isVisibleElement).at(-1) ||
            containers.at(-1) ||
            null
        );
    }

    const cssEscape = value => {
        if (globalThis.CSS?.escape) {
            return CSS.escape(String(value ?? ""));
        }

        return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
    };

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

    function toNumber(value, fallback = 0) {
        if (value === null || value === undefined || value === "") {
            return fallback;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function sameNumeric(a, b) {
        return Number(a) === Number(b) && Number.isFinite(Number(a));
    }

    function normalizeOfficialTeamName(value) {
        return clean(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function sum(values) {
        let total = 0;

        for (const value of values) {
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

    // ============================================================
    // CONTEXTO ROVER: SOLO BASKETBALL > IBB
    // ============================================================

    function findSelectByLabel(labelText) {
        const wanted = upper(labelText);

        if (wanted === "CATEGORY") {
            return pickBestElement(
                'select#categoria, select[name="categoria"], select[name="category"]'
            );
        }

        if (wanted === "LEAGUE") {
            const direct = pickBestElement(
                'select#liga, select[name="liga"], select[name="league"]'
            );

            if (direct) return direct;
        }

        const markers = document.querySelectorAll(
            "label, h1, h2, h3, h4, h5, h6, .box-title"
        );

        for (const marker of markers) {
            if (!upper(marker.textContent).includes(wanted)) continue;

            const containers = [
                marker.parentElement,
                marker.closest?.(".example"),
                marker.closest?.(".form-group"),
                marker.closest?.("[class*='col-']")
            ].filter(Boolean);

            for (const container of containers) {
                const select = container.querySelector?.("select");
                if (select) return select;
            }
        }

        return null;
    }

    function getSelected(select) {
        if (!select) {
            return { value: "", text: "" };
        }

        const option = select.options?.[select.selectedIndex];

        return {
            value: upper(select.value),
            text: upper(option?.textContent)
        };
    }

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
        const nodes = [...document.querySelectorAll(
            'input[name="fecha"], input[id="fecha"]'
        )];

        const ordered = [
            ...nodes.filter(isVisibleElement).reverse(),
            ...nodes.filter(node => !isVisibleElement(node)).reverse()
        ];

        for (const el of ordered) {
            const normalized = normalizeDateInput(el.value);
            if (normalized) return normalized;
        }

        return "";
    }

    function getContext() {
        return {
            category: getSelected(findSelectByLabel("CATEGORY")),
            league: getSelected(findSelectByLabel("LEAGUE")),
            date: getIsoDate(),
            tableExists: !!getEventsTable(),
            editorExists: !!getEditorContainer()
        };
    }

    function isEuroLeagueSelection() {
        const ctx = getContext();

        const categoryOK =
            ctx.category.value === "2" ||
            ctx.category.text === "BASKETBALL";

        const leagueOK =
            ctx.league.value === "66" ||
            ctx.league.text === "IBB";

        return categoryOK && leagueOK;
    }

    function currentFilterSignature() {
        const ctx = getContext();

        return [
            ctx.category.value,
            ctx.category.text,
            ctx.league.value,
            ctx.league.text,
            ctx.date
        ].join("|");
    }

    function tableFingerprint() {
        const table = getEventsTable();
        if (!table) return "";

        return [...table.querySelectorAll("tr")]
            .map(row => {
                const tkt = clean(row.getAttribute("tkt"));
                const content = clean(row.getAttribute("data-content"));
                const text = clean(row.innerText);
                return `${tkt}::${content}::${text}`;
            })
            .join("||");
    }

    function isFilterControl(target) {
        if (!(target instanceof Element)) return false;

        return Boolean(
            target === findSelectByLabel("CATEGORY") ||
            target === findSelectByLabel("LEAGUE") ||
            target.matches('#fecha, [name="fecha"]')
        );
    }

    function markFiltersDirty() {
        contextGate.dirty = true;
        contextGate.searchRequested = false;
        contextGate.signature = currentFilterSignature();
        contextGate.staleFingerprint = tableFingerprint();
        contextGate.staleTableNode = getEventsTable();
        removeUi();
    }

    function isMainSearchButton(target) {
        if (!(target instanceof Element)) return false;

        const control = target.closest(
            'button, input[type="button"], input[type="submit"], a'
        );

        if (!control || control.closest(`#${cssEscape(UI_ID)}`)) {
            return false;
        }

        const label = upper(
            control.tagName === "INPUT" ? control.value : control.textContent
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
            const table = getEventsTable();

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
                    `${TAG} ✅ Search aplicado: ${contextGate.signature}`
                );

                if (isEuroLeagueSelection()) {
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
                `${TAG} ⏳ Search no produjo una transición detectable de #tablaEventos. ` +
                `La UI permanece bloqueada para no mezclar ligas/fechas.`
            );
        }

        return false;
    }

    function beginSearchRefreshWatch() {
        contextGate.searchRequested = true;
        contextGate.dirty = true;
        contextGate.signature = currentFilterSignature();
        contextGate.staleFingerprint = tableFingerprint();
        contextGate.staleTableNode = getEventsTable();

        const token = ++contextGate.watchToken;

        void waitForSearchRefresh(token).catch(error =>
            console.error(`${TAG} Search gate error`, error)
        );
    }

    function rowDateFromContent(row) {
        const content = clean(row?.getAttribute("data-content"));
        let match = content.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);

        if (match) {
            const [, dd, mm, yyyy] = match;
            return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        }

        match = content.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
        return match ? match[0] : "";
    }

    function rowIsIbb(row) {
        const title = upper(row?.getAttribute("title"));
        return title.includes("BASKETBALL") && /\bIBB\b/.test(title);
    }

    function tableMatchesCurrentIbbContext() {
        const table = getEventsTable();
        if (!table) return false;

        const rows = [...table.querySelectorAll("tr[tkt]")];
        const ibbRows = rows.filter(rowIsIbb);

        if (!ibbRows.length) return false;

        const selectedDate = getIsoDate();
        if (!selectedDate) return true;

        return ibbRows.some(row => rowDateFromContent(row) === selectedDate);
    }

    function isEuroLeagueView() {
        /*
         * La tabla cargada es la autoridad. Esto evita quedar bloqueados por
         * eventos change/select2 tardíos de Rover después de Search.
         * Si los filtros están en estado dirty, una tabla IBB cuya fecha coincide
         * sigue siendo segura; una tabla vieja de otra liga/fecha no pasa este gate.
         */
        return Boolean(
            isEuroLeagueSelection() &&
            tableMatchesCurrentIbbContext() &&
            getEditorContainer()
        );
    }

    // ============================================================
    // EVENTOS ROVER
    // ============================================================

    function dateFromRow(row) {
        const globalIso = getIsoDate();
        if (globalIso) return globalIso;

        const content = clean(row?.getAttribute("data-content"));
        const match = content.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);

        if (match) {
            const [, dd, mm, yyyy] = match;
            return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        }

        return "";
    }

    function parseTeam(text) {
        const raw = clean(text);
        const match = raw.match(/^(\d+)\s+(.+)$/);

        if (!match) {
            return { roverCode: "", roverName: raw };
        }

        return {
            roverCode: match[1],
            roverName: clean(match[2])
        };
    }

    function parseRoverRow(row) {
        if (!row) return null;

        const cells = [...row.querySelectorAll("td")];
        if (cells.length < 3) return null;

        const ref = clean(cells[0].innerText).replace(/\D/g, "");
        if (!ref) return null;

        return {
            roverEventId: ref,
            date: dateFromRow(row),
            away: parseTeam(cells[1].innerText),
            home: parseTeam(cells[2].innerText),
            row
        };
    }

    function findRoverRowById(roverEventId) {
        const id = clean(roverEventId);
        if (!id) return null;

        const table = getEventsTable();
        if (!table) return null;

        return (
            table.querySelector(`tr[tkt="${cssEscape(id)}"]`) ||
            [...table.querySelectorAll("tr")].find(tr =>
                clean(tr.querySelector("td")?.innerText).replace(/\D/g, "") === id
            ) ||
            null
        );
    }

    function getRoverEventById(roverEventId) {
        const id = clean(roverEventId);

        if (!id) {
            return { valid: false, reason: "NO_ROVER_EVENT_ID" };
        }

        const row = findRoverRowById(id);

        if (!row) {
            return {
                valid: false,
                reason: "ROW_NOT_FOUND",
                roverEventId: id
            };
        }

        const parsed = parseRoverRow(row);

        if (!parsed) {
            return {
                valid: false,
                reason: "INVALID_ROW",
                roverEventId: id
            };
        }

        return {
            valid: parsed.roverEventId === id,
            reason: parsed.roverEventId === id ? "" : "IDENTITY_MISMATCH",
            ...parsed
        };
    }

    function getCurrentRoverEvent() {
        if (!isEuroLeagueView()) {
            return { valid: false, reason: "NOT_EUROLEAGUE_VIEW" };
        }

        const container = getEditorContainer();
        const editorId = clean(
            container?.querySelector('input[name="evento[]"]')?.value
        );

        if (!editorId) {
            return { valid: false, reason: "NO_EDITOR_EVENT" };
        }

        const rover = getRoverEventById(editorId);

        if (!rover.valid) return rover;

        return rover;
    }

    function roverTeamLine(rover) {
        return `${clean(rover?.away?.roverName)} @ ${clean(rover?.home?.roverName)}`;
    }

    // ============================================================
    // VÍNCULO MANUAL PERSISTENTE
    // ============================================================

    function linkKey(roverEventId) {
        return `${LINK_PREFIX}${String(roverEventId || "")}`;
    }

    function candidateKey(event) {
        return clean(
            event?.identifier ||
            `${event?.seasonCode || event?.season?.code || ""}_${event?.code ?? ""}`
        );
    }

    function getManualLink(roverEventId) {
        const id = clean(roverEventId);
        if (!id) return null;

        try {
            const raw = localStorage.getItem(linkKey(id));
            if (!raw) return null;

            const value = JSON.parse(raw);

            if (!value?.seasonCode || !Number.isFinite(Number(value?.gameCode))) {
                return null;
            }

            return value;
        } catch (error) {
            console.warn(`${TAG} vínculo inválido para Rover #${id}`, error);
            return null;
        }
    }

    function saveManualLink(roverEventId, event) {
        const id = clean(roverEventId);
        const gameCode = Number(event?.code);
        const seasonCode = clean(event?.seasonCode || event?.season?.code);

        if (!id || !seasonCode || !Number.isInteger(gameCode) || gameCode <= 0) {
            throw new Error("Juego EuroLeague inválido.");
        }

        const rover = getRoverEventById(id);

        const payload = {
            mode: "manual",
            roverEventId: id,
            euroleagueEventId: candidateKey(event),
            seasonCode,
            gameCode,
            phaseTypeCode: clean(event?.phaseTypeCode || event?.phaseType?.code),
            roundNumber: Number(event?.roundNumber ?? event?.round?.round) || null,
            date: clean(rover?.date || event?.roverDate),
            apiDate: clean(event?.date),
            awayName: clean(event?.away?.name || event?.awayName),
            homeName: clean(event?.home?.name || event?.homeName),
            status: clean(event?.status),
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(linkKey(id), JSON.stringify(payload));
        return payload;
    }

    function removeManualLink(roverEventId) {
        const id = clean(roverEventId);
        if (id) localStorage.removeItem(linkKey(id));
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

        console.log(`${TAG} vínculos eliminados: ${removed}`);
        return removed;
    }

    // ============================================================
    // HTTP EUROLeague
    // ============================================================

    function gmGetText(url, timeout = 12000) {
        return new Promise((resolve, reject) => {
            const request = {
                method: "GET",
                url,
                headers: {
                    Accept: "application/json, text/plain, */*"
                },
                timeout,
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(String(response.responseText || ""));
                        return;
                    }

                    reject(
                        new Error(`HTTP ${response.status} en ${url}`)
                    );
                },
                ontimeout: () => reject(new Error(`Timeout consultando ${url}`)),
                onerror: () => reject(new Error(`Error de red consultando ${url}`))
            };

            try {
                if (typeof GM_xmlhttpRequest === "function") {
                    GM_xmlhttpRequest(request);
                    return;
                }

                if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") {
                    GM.xmlHttpRequest(request);
                    return;
                }
            } catch (error) {
                reject(error);
                return;
            }

            reject(new Error("GM_xmlhttpRequest no está disponible."));
        });
    }

    async function gmGetJson(url, timeout = 12000) {
        const text = await gmGetText(url, timeout);

        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(`JSON inválido desde ${url}: ${error.message}`);
        }
    }

    function unwrapFeedPayload(payload, label) {
        if (payload?.status === "success" && payload?.data !== undefined) {
            return payload.data;
        }

        if (payload?.data !== undefined) {
            return payload.data;
        }

        throw new Error(`${label}: respuesta inesperada.`);
    }

    function dateOnly(value) {
        const text = clean(value);
        const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : "";
    }

    function apiDateToRoverDate(isoDate) {
        if (!isoDate) return "";

        try {
            const parts = new Intl.DateTimeFormat("en-CA", {
                timeZone: TIME_ZONE,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).formatToParts(new Date(isoDate));

            const map = Object.fromEntries(
                parts.map(part => [part.type, part.value])
            );

            return `${map.year}-${map.month}-${map.day}`;
        } catch (_) {
            return "";
        }
    }

    function formatApiTime(isoDate) {
        if (!isoDate) return "";

        try {
            return new Intl.DateTimeFormat("en-US", {
                timeZone: TIME_ZONE,
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }).format(new Date(isoDate));
        } catch (_) {
            return "";
        }
    }

    async function fetchSeasons({ force = false } = {}) {
        if (
            !force &&
            CACHE.seasons &&
            Date.now() - CACHE.seasonsSavedAt < CACHE_TTL.seasons
        ) {
            return CACHE.seasons;
        }

        const payload = await gmGetJson(`${FEED_BASE}/seasons`);
        const data = unwrapFeedPayload(payload, "SEASONS");
        const seasons = Array.isArray(data) ? data : [];

        CACHE.seasons = seasons;
        CACHE.seasonsSavedAt = Date.now();

        return seasons;
    }

    function seasonContainsDate(season, roverDate) {
        const start = dateOnly(season?.startDate);
        const end = dateOnly(season?.endDate);

        return Boolean(
            start && end && roverDate >= start && roverDate <= end
        );
    }

    async function resolveSeason(roverDate, { force = false } = {}) {
        const seasons = await fetchSeasons({ force });
        const season = seasons.find(item => seasonContainsDate(item, roverDate));

        if (!season?.code) {
            throw new Error(`No se encontró temporada EuroLeague para ${roverDate}.`);
        }

        return season;
    }

    async function fetchRounds(seasonCode, { force = false } = {}) {
        const key = clean(seasonCode);
        const cached = CACHE.roundsBySeason.get(key);

        if (
            !force &&
            cached &&
            Date.now() - cached.savedAt < CACHE_TTL.rounds
        ) {
            return cached.value;
        }

        const payload = await gmGetJson(
            `${FEED_BASE}/seasons/${encodeURIComponent(key)}/rounds`
        );
        const data = unwrapFeedPayload(payload, "ROUNDS");
        const rounds = Array.isArray(data) ? data : [];

        CACHE.roundsBySeason.set(key, {
            savedAt: Date.now(),
            value: rounds
        });

        return rounds;
    }

    function roundContainsDate(round, roverDate) {
        const min = dateOnly(round?.minGameStartDate);
        const max = dateOnly(round?.maxGameStartDate);

        return Boolean(min && max && roverDate >= min && roverDate <= max);
    }

    async function fetchRoundGames(
        seasonCode,
        phaseTypeCode,
        roundNumber,
        { force = false } = {}
    ) {
        const key = `${seasonCode}|${phaseTypeCode}|${roundNumber}`;
        const cached = CACHE.roundGames.get(key);

        if (
            !force &&
            cached &&
            Date.now() - cached.savedAt < CACHE_TTL.games
        ) {
            return cached.value;
        }

        const url =
            `${FEED_BASE}/seasons/${encodeURIComponent(seasonCode)}/games` +
            `?teamCode=&phaseTypeCode=${encodeURIComponent(phaseTypeCode)}` +
            `&roundNumber=${encodeURIComponent(roundNumber)}`;

        const payload = await gmGetJson(url);
        const data = unwrapFeedPayload(payload, "GAMES");
        const games = Array.isArray(data) ? data : [];

        CACHE.roundGames.set(key, {
            savedAt: Date.now(),
            value: games
        });

        return games;
    }

    function normalizeCandidate(rawGame, roundMeta, roverDate) {
        return {
            ...rawGame,
            seasonCode: clean(rawGame?.season?.code || roundMeta?.seasonCode),
            phaseTypeCode: clean(
                rawGame?.phaseType?.code || roundMeta?.phaseTypeCode
            ),
            roundNumber: Number(
                rawGame?.round?.round ?? roundMeta?.round
            ) || null,
            roverDate,
            identifier: clean(
                rawGame?.identifier ||
                `${rawGame?.season?.code || roundMeta?.seasonCode}_${rawGame?.code ?? ""}`
            )
        };
    }

    async function fetchEuroLeagueDay(roverDate, { force = false } = {}) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(roverDate)) {
            throw new Error("Fecha Rover inválida.");
        }

        const season = await resolveSeason(roverDate, { force });
        const rounds = await fetchRounds(season.code, { force });
        const matchingRounds = rounds.filter(round =>
            roundContainsDate(round, roverDate)
        );

        if (!matchingRounds.length) {
            return {
                season,
                rounds: [],
                games: []
            };
        }

        const settled = await Promise.allSettled(
            matchingRounds.map(async round => {
                const phaseTypeCode = clean(round.phaseTypeCode);
                const roundNumber = Number(round.round);

                if (!phaseTypeCode || !Number.isInteger(roundNumber)) {
                    throw new Error(
                        `Ronda inválida: ${round?.name || round?.round || "?"}`
                    );
                }

                const games = await fetchRoundGames(
                    season.code,
                    phaseTypeCode,
                    roundNumber,
                    { force }
                );

                return { round, games };
            })
        );

        const byId = new Map();
        const errors = [];

        for (const item of settled) {
            if (item.status === "rejected") {
                errors.push(item.reason?.message || String(item.reason));
                continue;
            }

            for (const rawGame of item.value.games) {
                if (apiDateToRoverDate(rawGame?.date) !== roverDate) {
                    continue;
                }

                const game = normalizeCandidate(
                    rawGame,
                    item.value.round,
                    roverDate
                );

                const id = candidateKey(game);
                if (id) byId.set(id, game);
            }
        }

        if (!byId.size && errors.length === settled.length) {
            throw new Error(errors.join(" | "));
        }

        const games = [...byId.values()].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        console.log("");
        console.log("=== EUROLEAGUE / JUEGOS DEL DÍA ===");
        console.table(
            games.map(game => ({
                ID: candidateKey(game),
                FECHA: roverDate,
                HORA_RD: formatApiTime(game.date),
                AWAY: game.away?.name,
                HOME: game.home?.name,
                ESTADO_API: game.status,
                RONDA: game.roundNumber,
                FASE: game.phaseTypeCode
            }))
        );

        return {
            season,
            rounds: matchingRounds,
            games
        };
    }

    async function fetchGameFresh(link) {
        const seasonCode = clean(link?.seasonCode);
        const gameCode = Number(link?.gameCode);

        if (!seasonCode || !Number.isInteger(gameCode) || gameCode <= 0) {
            throw new Error("Vínculo EuroLeague inválido.");
        }

        const url =
            `${FEED_BASE}/seasons/${encodeURIComponent(seasonCode)}` +
            `/games/${encodeURIComponent(gameCode)}`;

        const payload = await gmGetJson(url);
        const game = unwrapFeedPayload(payload, "GAME");

        if (!game || Number(game.code) !== gameCode) {
            throw new Error("El endpoint devolvió un partido diferente al vinculado.");
        }

        return game;
    }

    async function fetchBoxscore(seasonCode, gameCode) {
        const url =
            `${LIVE_BASE}/Boxscore?gamecode=${encodeURIComponent(gameCode)}` +
            `&seasoncode=${encodeURIComponent(seasonCode)}`;

        return gmGetJson(url);
    }

    // ============================================================
    // SCORE / VALIDACIÓN
    // ============================================================

    function sumOvertimes(quarters) {
        return ["ot1", "ot2", "ot3", "ot4", "ot5"].reduce(
            (total, key) => total + toNumber(quarters?.[key], 0),
            0
        );
    }

    function normalizeSide(side) {
        const quarters = side?.quarters || {};

        return {
            name: clean(side?.name),
            code: clean(side?.code),
            q1: toNumber(quarters.q1, 0),
            q2: toNumber(quarters.q2, 0),
            q3: toNumber(quarters.q3, 0),
            q4: toNumber(quarters.q4, 0),
            ot: sumOvertimes(quarters),
            final: toNumber(side?.score, 0),
            rawQuarters: quarters
        };
    }

    function normalizeLinkedGame(rover, apiGame, link) {
        return {
            roverEventId: rover.roverEventId,
            roverDate: rover.date,
            seasonCode: clean(apiGame?.season?.code || link?.seasonCode),
            gameCode: Number(apiGame?.code),
            identifier: clean(apiGame?.identifier),
            apiDate: clean(apiGame?.date),
            status: clean(apiGame?.status).toLowerCase(),
            minute: clean(apiGame?.minute),
            remainingTime: clean(apiGame?.remainingTime),
            quarter: clean(apiGame?.quarter),
            round: Number(apiGame?.round?.round) || link?.roundNumber || null,
            phaseTypeCode: clean(apiGame?.phaseType?.code || link?.phaseTypeCode),
            away: normalizeSide(apiGame?.away),
            home: normalizeSide(apiGame?.home),
            manualLink: link,
            raw: apiGame
        };
    }

    function validateLinkIdentity(game, link) {
        if (Number(game.gameCode) !== Number(link.gameCode)) {
            return { ok: false, reason: "GAME_CODE_CHANGED" };
        }

        if (clean(game.seasonCode) !== clean(link.seasonCode)) {
            return { ok: false, reason: "SEASON_CHANGED" };
        }

        const linkedAway = normalizeOfficialTeamName(link.awayName);
        const linkedHome = normalizeOfficialTeamName(link.homeName);
        const freshAway = normalizeOfficialTeamName(game.away.name);
        const freshHome = normalizeOfficialTeamName(game.home.name);

        if (
            linkedAway &&
            linkedHome &&
            (linkedAway !== freshAway || linkedHome !== freshHome)
        ) {
            return {
                ok: false,
                reason: "API_TEAM_IDENTITY_CHANGED",
                linkedAway: link.awayName,
                linkedHome: link.homeName,
                freshAway: game.away.name,
                freshHome: game.home.name
            };
        }

        if (apiDateToRoverDate(game.apiDate) !== game.roverDate) {
            return {
                ok: false,
                reason: "API_DATE_CHANGED",
                roverDate: game.roverDate,
                apiDate: game.apiDate,
                apiRoverDate: apiDateToRoverDate(game.apiDate)
            };
        }

        return { ok: true };
    }

    function validateCurrentScore(game) {
        for (const [sideName, team] of [
            ["AWAY", game.away],
            ["HOME", game.home]
        ]) {
            const periodTotal = sum([
                team.q1,
                team.q2,
                team.q3,
                team.q4,
                team.ot
            ]);

            if (periodTotal === null) {
                return {
                    ok: false,
                    reason: `${sideName}_INVALID_PERIODS`
                };
            }

            if (periodTotal !== Number(team.final)) {
                return {
                    ok: false,
                    reason: `${sideName}_PERIOD_SUM_MISMATCH`,
                    periodTotal,
                    final: team.final
                };
            }
        }

        return { ok: true };
    }

    function boxscoreTeamRows(boxscore) {
        const byQuarter = Array.isArray(boxscore?.ByQuarter)
            ? boxscore.ByQuarter
            : [];
        const stats = Array.isArray(boxscore?.Stats)
            ? boxscore.Stats
            : [];

        return byQuarter.map(row => {
            const teamName = clean(row?.Team);
            const statsRow = stats.find(item =>
                normalizeOfficialTeamName(item?.Team) ===
                normalizeOfficialTeamName(teamName)
            );

            const playerTeamCode = clean(
                statsRow?.PlayersStats?.find?.(player => clean(player?.Team))?.Team
            );

            const pointsValue =
                statsRow?.totr?.Points ??
                statsRow?.total?.Points ??
                statsRow?.Total?.Points ??
                null;

            return {
                team: teamName,
                code: playerTeamCode,
                q1: toNumber(row?.Quarter1, 0),
                q2: toNumber(row?.Quarter2, 0),
                q3: toNumber(row?.Quarter3, 0),
                q4: toNumber(row?.Quarter4, 0),
                final:
                    pointsValue !== null && pointsValue !== undefined
                        ? Number(pointsValue)
                        : null
            };
        });
    }

    function findBoxscoreRow(rows, teamName, teamCode) {
        const wantedCode = upper(teamCode);

        if (wantedCode) {
            const byCode = rows.find(row => upper(row.code) === wantedCode);
            if (byCode) return byCode;
        }

        const wanted = normalizeOfficialTeamName(teamName);
        return rows.find(row =>
            normalizeOfficialTeamName(row.team) === wanted
        ) || null;
    }

    async function validateFinalWithBoxscore(game) {
        const boxscore = await fetchBoxscore(game.seasonCode, game.gameCode);

        if (boxscore?.Live === true) {
            return {
                ok: false,
                reason: "BOXSCORE_STILL_LIVE"
            };
        }

        const rows = boxscoreTeamRows(boxscore);
        const away = findBoxscoreRow(rows, game.away.name, game.away.code);
        const home = findBoxscoreRow(rows, game.home.name, game.home.code);

        if (!away || !home) {
            return {
                ok: false,
                reason: "BOXSCORE_TEAM_NOT_FOUND",
                rows
            };
        }

        for (const [sideName, feedTeam, boxTeam] of [
            ["AWAY", game.away, away],
            ["HOME", game.home, home]
        ]) {
            for (const quarter of ["q1", "q2", "q3", "q4"]) {
                if (!sameNumeric(feedTeam[quarter], boxTeam[quarter])) {
                    return {
                        ok: false,
                        reason: `${sideName}_${quarter.toUpperCase()}_BOXSCORE_MISMATCH`,
                        feed: feedTeam[quarter],
                        boxscore: boxTeam[quarter]
                    };
                }
            }

            if (
                boxTeam.final === null ||
                !sameNumeric(feedTeam.final, boxTeam.final)
            ) {
                return {
                    ok: false,
                    reason: `${sideName}_FINAL_BOXSCORE_MISMATCH`,
                    feed: feedTeam.final,
                    boxscore: boxTeam.final
                };
            }
        }

        return {
            ok: true,
            boxscore,
            rows
        };
    }

    // ============================================================
    // PLAN DE ESCRITURA ROVER
    // T1 = AWAY / T2 = HOME
    // NO TOCA ESTADO
    // ============================================================

    function buildRoverScorePlan(game) {
        const eventId = clean(game.roverEventId);

        return {
            eventId,
            editedId: `${eventId}-Edited`,
            scoreFields: [
                { id: `${eventId}T1Q1Basq`, label: "T1/AWAY Q1", value: game.away.q1 },
                { id: `${eventId}T1Q2Basq`, label: "T1/AWAY Q2", value: game.away.q2 },
                { id: `${eventId}T1Q3Basq`, label: "T1/AWAY Q3", value: game.away.q3 },
                { id: `${eventId}T1Q4Basq`, label: "T1/AWAY Q4", value: game.away.q4 },
                { id: `${eventId}T1OTBasq`, label: "T1/AWAY OT", value: game.away.ot },
                { id: `${eventId}T1TOTBasq`, label: "T1/AWAY F", value: game.away.final },

                { id: `${eventId}T2Q1Basq`, label: "T2/HOME Q1", value: game.home.q1 },
                { id: `${eventId}T2Q2Basq`, label: "T2/HOME Q2", value: game.home.q2 },
                { id: `${eventId}T2Q3Basq`, label: "T2/HOME Q3", value: game.home.q3 },
                { id: `${eventId}T2Q4Basq`, label: "T2/HOME Q4", value: game.home.q4 },
                { id: `${eventId}T2OTBasq`, label: "T2/HOME OT", value: game.home.ot },
                { id: `${eventId}T2TOTBasq`, label: "T2/HOME F", value: game.home.final }
            ]
        };
    }

    function verifyRoverScoreControls(plan) {
        const container = getEditorContainer();

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
            ? { ok: false, reason: "MISSING_SCORE_CONTROLS", missing }
            : { ok: true, container };
    }

    function statusNotice(game, validatedFinal = false) {
        if (game.status === "result") {
            return {
                className: "is-final",
                text: `FINAL · ${game.away.final}-${game.home.final}${validatedFinal ? " · VALIDADO ✓" : ""}`,
                title: `${game.away.name} ${game.away.final} - ${game.home.final} ${game.home.name}`
            };
        }

        if (game.status === "live") {
            const period = game.quarter ? `Q${game.quarter}` : "LIVE";
            const clock = game.remainingTime ? ` · ${game.remainingTime}` : "";

            return {
                className: "is-live",
                text: `${period}${clock} · ${game.away.final}-${game.home.final} · CARGADO ✓`,
                title: `${game.away.name} ${game.away.final} - ${game.home.final} ${game.home.name}`
            };
        }

        return {
            className: "is-pre",
            text: `${upper(game.status || "CONFIRMED")} · ${game.away.final}-${game.home.final} · CARGADO ✓`,
            title: `${game.away.name} @ ${game.home.name}`
        };
    }

    function storeResultNotice(roverEventId, notice) {
        uiState.lastNoticeByEvent[String(roverEventId || "")] = {
            className: clean(notice?.className),
            text: clean(notice?.text),
            title: clean(notice?.title)
        };
    }

    function getStoredResultNotice(roverEventId) {
        return uiState.lastNoticeByEvent[String(roverEventId || "")] || null;
    }

    function clearStoredResultNotice(roverEventId) {
        delete uiState.lastNoticeByEvent[String(roverEventId || "")];
    }

    async function readLinkedGameFresh() {
        const rover = getCurrentRoverEvent();

        if (!rover?.valid) {
            throw new Error("Selecciona primero un evento Rover IBB.");
        }

        const link = getManualLink(rover.roverEventId);

        if (!link) {
            throw new Error("Este evento Rover no está vinculado.");
        }

        const apiGame = await fetchGameFresh(link);
        const game = normalizeLinkedGame(rover, apiGame, link);
        const identity = validateLinkIdentity(game, link);

        if (!identity.ok) {
            console.error(`${TAG} identidad del vínculo no válida`, identity);
            throw new Error(`VÍNCULO NO VÁLIDO: ${identity.reason}`);
        }

        console.log("");
        console.log("=== EUROLEAGUE / VÍNCULO MANUAL ===");
        console.table([{
            ROVER_EVENT_ID: rover.roverEventId,
            EUROLEAGUE_ID: game.identifier || `${game.seasonCode}_${game.gameCode}`,
            ROVER: roverTeamLine(rover),
            EUROLEAGUE: `${game.away.name} @ ${game.home.name}`,
            ESTADO_API: game.status,
            PERIODO: game.quarter,
            RELOJ: game.remainingTime,
            FECHA_API: game.apiDate
        }]);

        console.log("");
        console.log("=== SCORE EUROLEAGUE ===");
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
        console.log(`EUROLEAGUE IBB SCORE UPDATE v${VERSION}`);
        console.log("==============================================");

        const game = await readLinkedGameFresh();
        const consistency = validateCurrentScore(game);

        if (!consistency.ok) {
            console.error(`${TAG} ⛔ score inconsistente`, consistency);
            setResultNoticeError("DATOS API EN TRANSICIÓN · REINTENTA");

            return {
                ok: false,
                applied: false,
                reason: consistency.reason,
                game,
                consistency
            };
        }

        let finalValidation = null;

        if (game.status === "result") {
            finalValidation = await validateFinalWithBoxscore(game);

            if (!finalValidation.ok) {
                console.error(
                    `${TAG} ⛔ final no validado con Boxscore`,
                    finalValidation
                );
                setResultNoticeError(
                    `FINAL NO VALIDADO · ${finalValidation.reason}`
                );

                return {
                    ok: false,
                    applied: false,
                    reason: finalValidation.reason,
                    game,
                    finalValidation
                };
            }
        }

        const plan = buildRoverScorePlan(game);
        const verification = verifyRoverScoreControls(plan);

        if (!verification.ok) {
            console.error(`${TAG} ⛔ controles Rover inválidos`, verification);
            setResultNoticeError("NO SE PUDO LLENAR ROVER");

            return {
                ok: false,
                applied: false,
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
            if (edited) setRoverFieldValue(edited, "1");
        }

        const notice = statusNotice(
            game,
            Boolean(finalValidation?.ok)
        );

        storeResultNotice(game.roverEventId, notice);
        setResultNotice(getUiRoot(), notice);

        console.log("");
        console.log("=== SCORE APLICADO A ROVER ===");
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
            finalValidation,
            elapsedMs: Math.round(performance.now() - startedAt)
        };
    }

    // ============================================================
    // UI
    // ============================================================

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${UI_ID} {
                width: 100%;
                margin: 0 0 10px 0;
                position: relative;
                z-index: 9;
                font-family: Arial, Helvetica, sans-serif;
            }

            #${UI_ID} * { box-sizing: border-box; }

            #${UI_ID} .rs-el-panel {
                display: grid;
                grid-template-columns: 32px minmax(0, 1fr);
                align-items: start;
                gap: 6px;
                width: 100%;
            }

            #${UI_ID} .rs-el-title {
                width: 26px;
                height: 29px;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                margin-left: 6px;
                color: #1f6fe5;
                font-size: 12px;
                font-weight: 700;
                line-height: 29px;
                white-space: nowrap;
                user-select: none;
            }

            #${UI_ID} .rs-el-main {
                min-width: 0;
                position: relative;
            }

            #${UI_ID} .rs-el-search-row {
                display: grid;
                grid-template-columns: minmax(220px, 1fr) auto;
                gap: 4px;
                align-items: start;
                width: 100%;
            }

            #${UI_ID} .rs-el-searchbox {
                position: relative;
                min-width: 0;
                width: 100%;
            }

            #${UI_ID} .rs-el-filter {
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
            }

            #${UI_ID} .rs-el-list {
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

            #${UI_ID} .rs-el-row {
                display: block;
                padding: 9px;
                border-top: 1px solid #dcdcdc;
                background: #fff;
                color: #333;
                font-size: 12px;
                line-height: 1.25;
                cursor: pointer;
                user-select: none;
            }

            #${UI_ID} .rs-el-row:first-child { border-top: 0; }
            #${UI_ID} .rs-el-row:hover { background: #f3f3f3; }

            #${UI_ID} .rs-el-row.is-selected {
                background: #ebfaf4;
                box-shadow: inset 3px 0 0 #00c191;
            }

            #${UI_ID} .rs-el-line {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            #${UI_ID} .rs-el-meta {
                margin-top: 2px;
                color: #777;
                font-size: 10px;
            }

            #${UI_ID} .rs-el-btn {
                border: 1px solid transparent;
                border-radius: 0;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                line-height: 1;
                user-select: none;
            }

            #${UI_ID} .rs-el-btn:disabled {
                opacity: .55;
                cursor: not-allowed;
            }

            #${UI_ID} .rs-el-btn-link {
                min-width: 82px;
                height: 29px;
                padding: 0 10px;
                background: #00c191;
                border-color: #00c191;
                color: #fff;
            }

            #${UI_ID} .rs-el-linked-inline {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 34px 22px;
                gap: 4px;
                align-items: center;
                width: 100%;
            }

            #${UI_ID} .rs-el-pill {
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

            #${UI_ID} .rs-el-pill-main {
                min-width: 0;
                flex: 1 1 auto;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            #${UI_ID} .rs-el-notice {
                flex: 0 0 auto;
                white-space: nowrap;
                font-size: 11px;
                font-weight: 600;
                color: #607d8b;
            }

            #${UI_ID} .rs-el-notice.is-live { color: #c62828; }
            #${UI_ID} .rs-el-notice.is-final { color: #1c5e27; }
            #${UI_ID} .rs-el-notice.is-error { color: #c62828; }
            #${UI_ID} .rs-el-notice.is-pre { color: #607d8b; }

            #${UI_ID} .rs-el-btn-refresh {
                width: 34px;
                height: 29px;
                padding: 0;
                background: #a88de4;
                border-color: #a88de4;
                color: #fff;
                font-size: 15px;
            }

            #${UI_ID} .rs-el-btn-unlink {
                width: 22px;
                height: 22px;
                padding: 0;
                background: #f79a7a;
                border-color: #f79a7a;
                color: #fff;
                font-size: 14px;
            }

            #${UI_ID} .rs-el-summary {
                grid-column: 1 / -1;
                display: none;
                padding: 4px 6px;
                border: 1px solid #edc6ca;
                background: #fff7f8;
                color: #9a3942;
                font-size: 11px;
                text-align: center;
            }

            #${UI_ID} .rs-el-summary.is-visible { display: block; }

            #${UI_ID} .rs-el-summary.is-warning {
                display: block;
                background: #fff3cd;
                border: 1px solid #f2c66d;
                color: #8a5a00;
            }

            #${UI_ID} .rs-el-empty {
                padding: 8px 9px;
                background: #fff;
                color: #777;
                font-size: 11px;
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

        clearTimeout(uiState.collapseTimer);
        uiState.collapseTimer = 0;
    }

    function findUiAnchor(roverEventId) {
        const container = getEditorContainer();
        if (!container) return null;

        const id = clean(roverEventId);

        if (id) {
            const estado = container.querySelector(
                `#${cssEscape(`${id}-Estado`)}`
            );
            const estadoTable = estado?.closest("table");
            if (estadoTable) return estadoTable;

            const eventTable = [...container.querySelectorAll("table")].find(
                table => clean(table.innerText).includes(`#${id}`)
            );
            if (eventTable) return eventTable;
        }

        return container.querySelector("#basquetRes table, table") || null;
    }

    function ensureUiRoot(roverEventId) {
        const container = getEditorContainer();
        if (!container) return null;

        let root = getUiRoot();

        if (!root || !container.contains(root)) {
            root = document.createElement("div");
            root.id = UI_ID;
        }

        root.dataset.roverEventId = clean(roverEventId);
        const anchor = findUiAnchor(roverEventId);

        if (anchor?.parentNode) {
            if (root.parentNode !== anchor.parentNode || root.nextSibling !== anchor) {
                anchor.parentNode.insertBefore(root, anchor);
            }
        } else if (!root.isConnected) {
            container.prepend(root);
        }

        return root;
    }

    function rebuildUiRootForEvent(roverEventId) {
        getUiRoot()?.remove();
        return ensureUiRoot(roverEventId);
    }

    function setUiBusy(root, busy) {
        if (!root) return;

        for (const button of root.querySelectorAll("button")) {
            button.disabled = Boolean(busy);
        }

        const input = root.querySelector('[data-role="filter"]');
        if (input) input.disabled = Boolean(busy);
    }

    function getFilteredCandidates() {
        const query = upper(uiState.filterValue);
        const events = [...uiState.manualCandidates.values()];

        if (!query) return events;

        return events.filter(event => {
            const haystack = upper([
                event.away?.name,
                event.home?.name,
                event.identifier,
                event.status,
                event.roundNumber,
                formatApiTime(event.date)
            ].join(" "));

            return haystack.includes(query);
        });
    }

    function manualCandidateLabel(event) {
        const time = formatApiTime(event.date);
        const round = event.roundNumber ? `Round ${event.roundNumber}` : "";
        const status = upper(event.status);

        return [
            `${event.away?.name} @ ${event.home?.name}`,
            time,
            round,
            status,
            event.identifier
        ].filter(Boolean).join(" — ");
    }

    function renderLinked(root, rover, link) {
        const storedNotice = getStoredResultNotice(rover.roverEventId);
        const noticeClass = storedNotice?.className
            ? ` ${escapeHtml(storedNotice.className)}`
            : "";
        const noticeText = storedNotice?.text
            ? escapeHtml(storedNotice.text)
            : "";
        const noticeTitle = storedNotice?.title
            ? ` title="${escapeHtml(storedNotice.title)}"`
            : "";
        const line = `${link.awayName} @ ${link.homeName}`;

        root.innerHTML = `
            <div class="rs-el-panel">
                <div class="rs-el-title">EL</div>
                <div class="rs-el-main">
                    <div class="rs-el-linked-inline">
                        <div class="rs-el-pill" title="${escapeHtml(line)}">
                            <span class="rs-el-pill-main">${escapeHtml(line)}</span>
                            <span class="rs-el-notice${noticeClass}"
                                  data-role="result-notice"${noticeTitle}>${noticeText}</span>
                        </div>
                        <button type="button"
                                class="rs-el-btn rs-el-btn-refresh"
                                data-el-action="update-result"
                                title="Actualizar Q1-Q4/OT/F desde EuroLeague">↻</button>
                        <button type="button"
                                class="rs-el-btn rs-el-btn-unlink"
                                data-el-action="unlink"
                                title="Desvincular">×</button>
                    </div>
                </div>
                <div class="rs-el-summary" data-role="summary"></div>
            </div>
        `;
    }

    function renderUnlinked(root) {
        const restoreFocus = Boolean(
            document.activeElement?.matches?.(
                `#${cssEscape(UI_ID)} [data-role="filter"]`
            )
        );
        const filtered = getFilteredCandidates();

        if (
            uiState.selectedEventId &&
            !filtered.some(event => candidateKey(event) === uiState.selectedEventId)
        ) {
            uiState.selectedEventId = "";
        }

        const listHtml = uiState.loadingCandidates
            ? `<div class="rs-el-empty">Buscando juegos EuroLeague...</div>`
            : uiState.lastLoadError
                ? `<div class="rs-el-empty">${escapeHtml(uiState.lastLoadError)}</div>`
                : filtered.length
                    ? filtered.map(event => {
                        const id = candidateKey(event);
                        const selectedClass =
                            id === uiState.selectedEventId ? " is-selected" : "";
                        const line = `${event.away?.name} @ ${event.home?.name}`;
                        const meta = [
                            formatApiTime(event.date),
                            event.roundNumber ? `Round ${event.roundNumber}` : "",
                            upper(event.status)
                        ].filter(Boolean).join(" · ");

                        return `
                            <div class="rs-el-row${selectedClass}"
                                 data-el-action="pick-candidate"
                                 data-event-id="${escapeHtml(id)}"
                                 title="${escapeHtml(manualCandidateLabel(event))}">
                                <div class="rs-el-line">${escapeHtml(line)}</div>
                                <div class="rs-el-meta">${escapeHtml(meta)}</div>
                            </div>
                        `;
                    }).join("")
                    : `<div class="rs-el-empty">No hay juegos EuroLeague para esta fecha.</div>`;

        root.innerHTML = `
            <div class="rs-el-panel">
                <div class="rs-el-title">EL</div>
                <div class="rs-el-main">
                    <div class="rs-el-search-row">
                        <div class="rs-el-searchbox">
                            <input type="text"
                                   class="rs-el-filter"
                                   data-role="filter"
                                   value="${escapeHtml(uiState.filterValue)}"
                                   placeholder="Buscar partido..."
                                   autocomplete="off">
                            <div class="rs-el-list"
                                 data-role="list"
                                 style="display:${uiState.listExpanded ? "block" : "none"};">
                                ${uiState.listExpanded ? listHtml : ""}
                            </div>
                        </div>
                        <button type="button"
                                class="rs-el-btn rs-el-btn-link"
                                data-el-action="manual-save"
                                data-event-id="${escapeHtml(uiState.selectedEventId)}"
                                ${uiState.selectedEventId ? "" : "disabled"}>Vincular</button>
                    </div>
                </div>
                <div class="rs-el-summary" data-role="summary"></div>
            </div>
        `;

        requestAnimationFrame(() => {
            if (!restoreFocus) return;
            const input = root.querySelector('[data-role="filter"]');

            if (input) {
                uiState.restoringFilterFocus = true;
                try {
                    input.focus({ preventScroll: true });
                    input.setSelectionRange(input.value.length, input.value.length);
                } catch (_) {}

                queueMicrotask(() => {
                    uiState.restoringFilterFocus = false;
                });
            }
        });
    }

    function setSummary(message, { warning = false } = {}) {
        const summary = getUiRoot()?.querySelector('[data-role="summary"]');
        if (!summary) return;

        const text = clean(message);
        summary.textContent = text;
        summary.classList.toggle("is-visible", Boolean(text));
        summary.classList.toggle("is-warning", Boolean(text) && warning);
    }

    function setResultNotice(root, notice) {
        const target = root?.querySelector('[data-role="result-notice"]');
        if (!target) return;

        target.className = `rs-el-notice ${clean(notice?.className)}`.trim();
        target.textContent = clean(notice?.text);
        target.title = clean(notice?.title);
    }

    function setResultNoticeError(message) {
        const rover = getCurrentRoverEvent();
        const notice = {
            className: "is-error",
            text: clean(message || "ERROR"),
            title: clean(message || "ERROR")
        };

        if (rover?.valid) {
            storeResultNotice(rover.roverEventId, notice);
        }

        setResultNotice(getUiRoot(), notice);
    }

    function selectCandidateInPlace(root, eventId) {
        const id = clean(eventId);

        if (!root || !id || !uiState.manualCandidates.has(id)) {
            return false;
        }

        uiState.selectedEventId = id;
        uiState.listExpanded = true;

        for (const row of root.querySelectorAll(
            '[data-el-action="pick-candidate"]'
        )) {
            row.classList.toggle(
                "is-selected",
                clean(row.dataset.eventId) === id
            );
        }

        const button = root.querySelector('[data-el-action="manual-save"]');

        if (button) {
            button.disabled = false;
            button.dataset.eventId = id;
        }

        setSummary("");
        return true;
    }

    function scheduleListCollapse() {
        clearTimeout(uiState.collapseTimer);

        uiState.collapseTimer = setTimeout(() => {
            uiState.listExpanded = false;
            void renderCurrent({ preserveSearchState: true });
        }, 140);
    }

    function cancelListCollapse() {
        clearTimeout(uiState.collapseTimer);
        uiState.collapseTimer = 0;
    }

    async function loadManualCandidates(root, rover, { force = false } = {}) {
        if (uiState.loadingCandidates) return;

        uiState.loadingCandidates = true;
        uiState.lastLoadError = "";
        await renderCurrent({ preserveSearchState: true });

        try {
            const day = await fetchEuroLeagueDay(rover.date, { force });
            const liveRoot = getUiRoot();
            const panelRover = getRoverEventById(rover.roverEventId);

            if (
                !liveRoot ||
                clean(liveRoot.dataset.roverEventId) !== clean(rover.roverEventId) ||
                !panelRover?.valid
            ) {
                return;
            }

            uiState.manualCandidates.clear();

            for (const event of day.games) {
                uiState.manualCandidates.set(candidateKey(event), event);
            }

            uiState.candidatesDate = rover.date;

            if (
                uiState.selectedEventId &&
                !uiState.manualCandidates.has(uiState.selectedEventId)
            ) {
                uiState.selectedEventId = "";
            }
        } catch (error) {
            console.error(`${TAG} error cargando juegos`, error);
            uiState.lastLoadError = error?.message || "No se pudieron cargar los juegos.";
        } finally {
            uiState.loadingCandidates = false;
            await renderCurrent({ preserveSearchState: true });
        }
    }

    async function expandList(rover, { forceLoad = false } = {}) {
        cancelListCollapse();
        uiState.listExpanded = true;

        const needsLoad =
            forceLoad ||
            uiState.candidatesDate !== rover.date ||
            !uiState.manualCandidates.size;

        if (needsLoad) {
            await loadManualCandidates(getUiRoot(), rover, {
                force: forceLoad
            });
        } else {
            await renderCurrent({ preserveSearchState: true });
        }
    }

    async function renderCurrent({ preserveSearchState = false } = {}) {
        const seq = ++uiState.renderSeq;

        if (!isEuroLeagueView()) {
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

        const root = ensureUiRoot(rover.roverEventId);
        if (!root || seq !== uiState.renderSeq) return null;

        const link = getManualLink(rover.roverEventId);

        if (link) {
            renderLinked(root, rover, link);
            return rover;
        }

        renderUnlinked(root);
        return rover;
    }

    function scheduleRender(delay = 80) {
        clearTimeout(uiState.renderTimer);

        uiState.renderTimer = setTimeout(() => {
            void renderCurrent().catch(error =>
                console.error(`${TAG} render error`, error)
            );
        }, delay);
    }

    async function onUiClick(event) {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const actionNode = target.closest(
            `#${cssEscape(UI_ID)} [data-el-action]`
        );
        if (!actionNode) return;

        event.preventDefault();
        event.stopPropagation();

        const action = actionNode.dataset.elAction;
        const root = getUiRoot();
        const panelRoverEventId = clean(root?.dataset.roverEventId);
        const currentRover = getCurrentRoverEvent();

        if (!root || !panelRoverEventId) return;

        if (action === "pick-candidate") {
            selectCandidateInPlace(root, actionNode.dataset.eventId);
            return;
        }

        if (action === "manual-save") {
            const fsId = clean(
                actionNode.dataset.eventId || uiState.selectedEventId
            );
            const candidate = uiState.manualCandidates.get(fsId);

            if (!candidate) {
                setSummary("Selecciona un juego EuroLeague.", { warning: true });
                return;
            }

            const rover = getRoverEventById(panelRoverEventId);
            if (!rover?.valid) {
                setSummary("El evento Rover ya no está disponible.", { warning: true });
                return;
            }

            saveManualLink(panelRoverEventId, candidate);
            clearStoredResultNotice(panelRoverEventId);
            uiState.listExpanded = false;
            uiState.selectedEventId = "";
            uiState.filterValue = "";
            setSummary("");

            console.log(`${TAG} 🔗 Rover #${panelRoverEventId} vinculado manualmente a ${candidateKey(candidate)}`);
            await renderCurrent({ preserveSearchState: true });
            return;
        }

        if (action === "unlink") {
            removeManualLink(panelRoverEventId);
            clearStoredResultNotice(panelRoverEventId);

            uiState.listExpanded = true;
            uiState.selectedEventId = "";
            uiState.filterValue = "";
            uiState.lastLoadError = "";

            const rover = getRoverEventById(panelRoverEventId);
            const freshRoot = rebuildUiRootForEvent(panelRoverEventId);

            if (freshRoot && rover?.valid) {
                renderUnlinked(freshRoot);

                const needsCandidates =
                    uiState.candidatesDate !== rover.date ||
                    !uiState.manualCandidates.size;

                if (needsCandidates) {
                    await loadManualCandidates(freshRoot, rover);
                }
            } else {
                await renderCurrent({ preserveSearchState: true });
            }

            return;
        }

        if (action === "update-result") {
            if (
                !currentRover?.valid ||
                currentRover.roverEventId !== panelRoverEventId
            ) {
                setSummary(
                    "Selecciona nuevamente este evento Rover antes de actualizar.",
                    { warning: true }
                );
                return;
            }

            const link = getManualLink(panelRoverEventId);
            if (!link) {
                setSummary("No hay un juego vinculado.", { warning: true });
                return;
            }

            setUiBusy(root, true);
            setResultNotice(root, {
                className: "is-pre",
                text: "Actualizando...",
                title: "Consultando EuroLeague"
            });

            try {
                await updateLinkedResult();
            } catch (error) {
                console.error(`${TAG} update error`, error);
                setResultNoticeError(error?.message || "ERROR EUROLEAGUE");
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

            if (
                uiState.selectedEventId &&
                !filtered.some(event => candidateKey(event) === uiState.selectedEventId)
            ) {
                uiState.selectedEventId = "";
            }

            void renderCurrent({ preserveSearchState: true });
        }
    }

    // ============================================================
    // OBSERVERS / BOOT
    // ============================================================

    function observeEditorContainer() {
        const container = getEditorContainer();
        if (!container) return false;

        if (
            uiState.observedContainer === container &&
            uiState.containerObserver
        ) {
            return true;
        }

        uiState.containerObserver?.disconnect();
        uiState.observedContainer = container;

        uiState.containerObserver = new MutationObserver(mutations => {
            const onlyOwnUiMutations =
                mutations.length > 0 &&
                mutations.every(mutation => {
                    const target =
                        mutation.target?.nodeType === Node.ELEMENT_NODE
                            ? mutation.target
                            : mutation.target?.parentElement;

                    return Boolean(
                        target &&
                        (
                            target.id === UI_ID ||
                            target.closest?.(`#${cssEscape(UI_ID)}`)
                        )
                    );
                });

            if (onlyOwnUiMutations) return;

            if (!isEuroLeagueView()) {
                removeUi();
                return;
            }

            const editorId = clean(
                container.querySelector('input[name="evento[]"]')?.value
            );

            if (!editorId) return;

            const root = getUiRoot();

            if (
                editorId !== uiState.lastEditorId ||
                !root ||
                root.dataset.roverEventId !== editorId ||
                !container.contains(root)
            ) {
                /*
                 * No adelantamos lastEditorId aquí. renderCurrent() necesita
                 * ver el ID anterior para limpiar selección/filtro del evento
                 * previo y evitar que un candidato quede preseleccionado.
                 */
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
        document.addEventListener(
            "pointerdown",
            event => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const row = target.closest(
                    `#${cssEscape(UI_ID)} [data-el-action="pick-candidate"]`
                );

                if (!row) return;

                const root = getUiRoot();
                if (!root || !root.contains(row)) return;

                if (selectCandidateInPlace(root, row.dataset.eventId)) {
                    event.stopImmediatePropagation();
                }
            },
            true
        );

        document.addEventListener(
            "click",
            event => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const uiAction = target.closest(
                    `#${cssEscape(UI_ID)} [data-el-action]`
                );

                if (uiAction) {
                    void onUiClick(event).catch(error => {
                        console.error(`${TAG} UI click error`, error);
                        setResultNoticeError(error?.message || "ERROR DE INTERFAZ");
                    });
                    return;
                }

                if (isMainSearchButton(target)) {
                    beginSearchRefreshWatch();
                    removeUi();
                    return;
                }

                if (!isEuroLeagueView()) return;

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
                        `#${cssEscape(UI_ID)} [data-role="filter"]`
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
                        `#${cssEscape(UI_ID)} [data-role="filter"]`
                    )
                ) {
                    return;
                }

                if (uiState.restoringFilterFocus) {
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
                if (!(target instanceof Element)) return;

                if (
                    target.matches(
                        `#${cssEscape(UI_ID)} [data-role="filter"]`
                    )
                ) {
                    const rover = getCurrentRoverEvent();

                    if (rover?.valid && !getManualLink(rover.roverEventId)) {
                        void expandList(rover).catch(error =>
                            console.error(`${TAG} hover expand error`, error)
                        );
                    }
                }

                if (target.closest(`#${cssEscape(UI_ID)}`)) {
                    cancelListCollapse();
                }
            },
            true
        );

        document.addEventListener(
            "mouseout",
            event => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const root = target.closest(`#${cssEscape(UI_ID)}`);
                if (!root) return;

                const next = event.relatedTarget;

                if (!(next instanceof Node) || !root.contains(next)) {
                    const rover = getCurrentRoverEvent();

                    if (rover?.valid && !getManualLink(rover.roverEventId)) {
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
                if (!(target instanceof Element)) return;

                if (isFilterControl(target)) {
                    markFiltersDirty();
                }
            },
            true
        );
    }

    function startPoll() {
        clearInterval(uiState.pollTimer);

        uiState.pollTimer = setInterval(() => {
            const active = isEuroLeagueView();

            /*
             * Rover/Select2 puede emitir change tardíos aun cuando la tabla ya
             * corresponde exactamente a BASKETBALL > IBB y a la fecha actual.
             * En ese caso la propia tabla valida el contexto y podemos limpiar
             * el dirty sin destruir/recrear la barra en un bucle.
             */
            if (contextGate.dirty && active) {
                contextGate.dirty = false;
                contextGate.searchRequested = false;
                contextGate.signature = currentFilterSignature();
                contextGate.staleFingerprint = tableFingerprint();
                contextGate.staleTableNode = getEventsTable();
            }

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
                getEditorContainer()?.querySelector('input[name="evento[]"]')?.value
            );

            if (editorId && editorId !== uiState.lastEditorId) {
                scheduleRender(40);
            }

            const root = getUiRoot();

            if (editorId && (!root || root.dataset.roverEventId !== editorId)) {
                scheduleRender(40);
            }
        }, 700);
    }

    function boot() {
        contextGate.signature = currentFilterSignature();
        contextGate.staleFingerprint = tableFingerprint();
        contextGate.staleTableNode = getEventsTable();

        installStyles();
        installGlobalListeners();
        observeEditorContainer();
        startPoll();
        scheduleRender(120);

        expose("__RS_EUROLEAGUE_IBB", {
            VERSION,
            isEuroLeagueSelection,
            isEuroLeagueView,
            tableMatchesCurrentIbbContext,
            getEventsTable,
            getEditorContainer,
            contextGate,
            getContext,
            getCurrentRoverEvent,
            getRoverEventById,
            fetchSeasons,
            fetchRounds,
            fetchEuroLeagueDay,
            fetchGameFresh,
            fetchBoxscore,
            getManualLink,
            saveManualLink,
            removeManualLink,
            clearAllLinks,
            readLinkedGameFresh,
            updateLinkedResult,
            apiDateToRoverDate,
            formatApiTime
        });

        const bootCtx = getContext();
        const bootEditorId = clean(
            getEditorContainer()?.querySelector('input[name="evento[]"]')?.value
        );
        const bootRow = bootEditorId ? findRoverRowById(bootEditorId) : null;

        console.log(
            `${TAG} v${VERSION} instalado. Manual-only: vincular partido + ↻ para Q1-Q4/OT/F. ESTADO no se toca.`
        );
        console.table([{
            URL: location.href,
            CATEGORY: `${bootCtx.category.value} / ${bootCtx.category.text}`,
            LEAGUE: `${bootCtx.league.value} / ${bootCtx.league.text}`,
            FECHA: bootCtx.date,
            TABLA: bootCtx.tableExists,
            TABLA_IBB_FECHA_OK: tableMatchesCurrentIbbContext(),
            EDITOR: bootCtx.editorExists,
            EVENTO: bootEditorId,
            FILA_EVENTO: Boolean(bootRow),
            FILA_TITLE: clean(bootRow?.getAttribute("title")),
            VIEW_OK: isEuroLeagueView()
        }]);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
