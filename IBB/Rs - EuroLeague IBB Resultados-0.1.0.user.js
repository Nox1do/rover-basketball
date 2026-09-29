// ==UserScript==
// @name         Rs - EuroLeague IBB Resultados
// @namespace    https://roversport.net/
// @version      0.1.0
// @description  EuroLeague / IBB: vinculación manual tipo CFL y actualización manual de Q1-Q4/OT/F desde la fuente oficial de EuroLeague.
// @author       noeg
// @match        https://www.roversport.net/adm/es/index.php*
// @match        https://roversport.net/adm/es/index.php*
// @match        https://www.roversport.lol/adm/es/index.php*
// @match        https://roversport.lol/adm/es/index.php*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      feeds.incrowdsports.com
// @connect      live.euroleague.net
// @run-at       document-idle
// ==/UserScript==

(() => {
    "use strict";

    const VERSION = "0.1.0";
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
            return (
                document.querySelector(
                    'select#categoria, select[name="categoria"], select[name="category"]'
                ) || null
            );
        }

        if (wanted === "LEAGUE") {
            const direct = document.querySelector(
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
        for (const el of document.querySelectorAll(
            'input[name="fecha"], input[id="fecha"]'
        )) {
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
            tableExists: !!document.querySelector("#tablaEventos"),
            editorExists: !!document.querySelector("#resEditContainer")
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
        const table = document.querySelector("#tablaEventos");
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
        contextGate.staleTableNode = document.querySelector("#tablaEventos");
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
        contextGate.staleTableNode = document.querySelector("#tablaEventos");

        const token = ++contextGate.watchToken;

        void waitForSearchRefresh(token).catch(error =>
            console.error(`${TAG} Search gate error`, error)
        );
    }

    function isEuroLeagueView() {
        return Boolean(
            isEuroLeagueSelection() &&
            !contextGate.dirty &&
            document.querySelector("#tablaEventos")
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

        return (
            document.querySelector(
                `#tablaEventos tr[tkt="${cssEscape(id)}"]`
            ) ||
            [...document.querySelectorAll("#tablaEventos tr")].find(tr =>
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

        const container = document.querySelector("#resEditContainer");
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
