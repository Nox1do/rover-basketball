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
