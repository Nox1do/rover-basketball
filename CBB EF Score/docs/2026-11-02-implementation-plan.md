# CBB Espn-Fox 0.0.1 Implementation Plan

Goal: adapt CFB FOX 1.0.13 to men's NCAA basketball with the user's confirmed Rover layout: H1 → Q2, H2 → Q4, Q1/Q3 empty, overtime → OT.

Architecture: retain the original single-file userscript's view adapters, matching engine, manual overrides, cache/in-flight sharing, context guards and UI. Replace sport-specific parsing, period validation, season selection and result plans. Use semantic h1/h2 fields internally. No automatic server saves or processing.

Tech stack: JavaScript, Firefox/Tampermonkey, Node's built-in test runner and VM for tests. No production dependencies.

Spec: DESIGN.md plus user-supplied CBB DOM metadata and explicit Q2/Q4 clarification.

Constraints: version 0.0.1; name CBB Espn-Fox; 276 verified Rover/ESPN/FOX mappings; BASKETBALL/CBB only; America/New_York independently of PC; ESPN primary with FOX confirmation; no POST or Save/Process clicks.

Review focus: half/quarter confusion; OT absent vs zero and aggregation; source/row changes during requests; admin states marked completed; cross-season schedules and DST.

## Task 1: basketball adaptation with regression tests

- [x] Write tests against existing CFB behavior: real Michigan/Duke fixture, halftime, H2 recovery, OT/multiple OT, missing scores, cancellation, wrong date/pair, Rover final/half plans and New York dates.
- [x] Run tests and observe failures before implementation.
- [x] Create src/CBB-Espn-Fox.user.js by adapting the supplied source; preserve tested infrastructure, replace basketball-specific functions and identities.
- [x] Run node --test tests/*.test.mjs; all tests must pass.

## Task 2: integration and delivery

- [x] Exercise actual request builders with captured JSON/HTTP stubs and editor writes with a deterministic DOM harness; test context switches and missing controls produce zero writes.
- [x] Review stale football logic, identifiers, URLs and cache/storage names; run syntax check.
- [x] Fresh code review of the adaptation, fix significant findings with regression tests, run complete suite.
- [x] Create .user.js, identical .txt fallback and a source/test/data ZIP for delivery.

Firefox authenticated live QA cannot be claimed without running in the user's actual Rover session; report this limitation explicitly.
