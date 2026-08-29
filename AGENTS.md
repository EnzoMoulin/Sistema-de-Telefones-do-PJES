# SYSTEM INSTRUCTIONS FOR THE GOOGLE APPS SCRIPT APPLICATION IN DEVELOPMENT

## 0. MANDATORY INITIAL READ ORDER & CONTEXT BOOTSTRAP
At the start of **every** turn or prompt session, you MUST execute the following boot sequence in exact order:
1. Read and apply the instructions in this file (`AGENTS.md`).
2. **IMMEDIATELY read the contents of `ARQUITETURA_E_GUIA_DE_TRABALHO.md` before processing any user instructions, analyzing logic, or generating code.**
3. Verify project architecture, layers, and guidelines established in both documents before executing any workspace operation.

## 1. Model & Effort Matrix
Evaluate task complexity against the active UI model configuration before generating code:
- LUNA (Low / Medium Effort): Use for configuration files, basic HTML/CSS, simple unit tests, documenting code, formatting text, or explaining isolated code blocks.
- TERRA (Medium / High Effort): Use for business logic functions, debugging common errors, minor refactoring, documented API integrations, and automation scripts.
- SOL (Medium Effort - Avoid Max/Ultra unless critical): Use for system architecture, complex concurrency/memory leaks, large-scale performance tuning, and infrastructure strategy.

For this project:
- Prefer LUNA for README.md, lightweight configuration changes in `01_Config.gs`, isolated frontend styling/layout work, and simple validation/test helpers.
- Prefer TERRA for business logic in `03_Database.gs`, `13_ForumContatoService.gs`, `14_ForumAPI.gs`, `15_ForumInstallation.gs`, `16_ForumV4Integration.gs`, `APIJS.html`, and `ForumNavigationJS.html`.
- Reserve SOL for cross-module architecture changes, authentication architecture, concurrency/idempotency redesign, V4 data-model migration, large SpreadsheetApp performance investigations, or frontend/backend latency analysis spanning several files.

## 2. Pre-Flight Check & Execution Guardrails
Before processing any request or generating code, verify the active UI configuration (Model & Effort):
- OVERKILL Warning: If the active model/effort is too powerful (e.g., SOL + Max Effort) for simple tasks, STOP. Warn the user about token waste and DO NOT execute until confirmed.
- UNDERPOWERED Warning: If the active model/effort is too weak (e.g., LUNA + Low Effort) for complex code, STOP. Warn the user, suggest upgrading, and HALT execution.

Additional project-specific pre-flight checks:
- Determine which architectural layer owns the requested change before editing.
- Do not place spreadsheet/data-access logic in frontend HTML/JS files.
- Do not duplicate Forum V4 business rules across `13_ForumContatoService.gs`, `14_ForumAPI.gs`, and `16_ForumV4Integration.gs`.
- Before adding a new helper, search for an existing equivalent function or constant.
- Before changing an API exposed to the frontend, identify every corresponding `google.script.run` caller.
- Before changing a sheet schema, identify every reader, writer, validator, migration helper, and configuration constant that depends on it.
- Treat authentication, authorization, data integrity, concurrency, and backward compatibility as mandatory pre-flight checks for CRUD changes.
- Never optimize a path without first identifying whether its dominant cost is SpreadsheetApp I/O, frontend/server roundtrips, repeated initialization, serialization/payload size, or redundant computation.

## 3. Database & XLSX / Google Sheets Validation Rules
- The application's persistent operational database is Google Sheets accessed from Google Apps Script through `SpreadsheetApp`; exported or auxiliary `.xlsx` files must not be treated as more authoritative than the live application schema. The names of .xlsx files are: `Banco de Dados Oficial - PJES Contatos - Externo.xlsx` and `Banco de Dados Oficial - PJES Contatos - Interno.xlsx`.
- The Forum V4 relational model uses the operational sheets:
  - `MUNICIPIOS`
  - `FORUM`
  - `UNIDADES`
  - `SETORES`
  - `CONTATOS`
- `TELEFONES` belongs to the legacy model and must not participate in normal V4 operation. V4 integrity validation must continue to flag its presence where the migration requires its removal.
- The verified `CONTATOS` schema is:
  - `ID`
  - `FORUM_ID`
  - `UNIDADE_ID`
  - `SETOR_ID`
  - `TIPO`
  - `DESCRICAO`
  - `VALOR`
  - `DATA_CRIACAO`
  - `DATA_ATUALIZACAO`
  - `ATIVO`
  - `ORDEM`
- Preserve the relational hierarchy and foreign-key semantics between municipality, forum, unit, sector, and contact records.
- Do not replace stable IDs with display names as relational keys.
- Contact IDs follow the existing generated-ID convention already used by V4 records; do not introduce an incompatible second ID format without an explicit migration.
- Preserve established sheet/table names and header spelling exactly unless the task explicitly includes a schema migration.

To prevent heavy token consumption:
- DO NOT read or parse entire `.xlsx` files into the chat context.
- DO NOT dump entire Google Sheets datasets into model context merely to inspect data.
- For data correctness and multi-table integrity analysis, use schemas, headers, targeted ranges, representative rows, counts, duplicate summaries, or executable project validators.
- Cross-reference foreign keys using lightweight targeted data rather than raw full-workbook content.
- Prefer programmatic validation functions and concise diagnostic summaries over thousands of spreadsheet rows.

Use the existing Forum V4 diagnostics where applicable:
- `validarArquiteturaForum`
- `validarDadosReaisForumV4API`
- `validarIntegridadeForumV4`

Do not interpret an authentication failure from a validator as proof that the underlying V4 data is invalid. Authentication/authorization failure and database-integrity failure are separate conditions and must be diagnosed separately.

## 4. Codex & Workspace Execution Rules
- Always default to the lowest model and effort tier possible.
- Only upgrade tiers if the previous execution fails or if the logic requires deep mathematical/abstract reasoning.
- Clear the conversation context or summarize long files before processing.
- DO NOT print full code blocks or code snippets in the chat interface.
- ALWAYS apply code changes and updates directly to the project files in the workspace.
- After successfully modifying the files, provide a very concise, punchy bullet-point explanation of exactly what changes were made.
- Always default to the most concise response possible to minimize output tokens.
- When debugging or fixing errors, do not guess or apply multiple random code fixes.
- Ask for terminal logs, precise error messages, or insert minimal `console.log`/`Logger.log` statements first to pinpoint the issue.
- Always output a single, definitive fix once the root cause is identified.

Project-specific workspace rules:
- Inspect the smallest relevant set of files first rather than loading the entire repository into context for every task.
- Expand analysis to adjacent modules only when dependencies require it.
- Never regenerate an entire large file when a precise localized edit is sufficient.
- Preserve existing public function names and frontend API contracts unless the requested change explicitly requires a breaking change.
- Do not create parallel implementations of Forum V4 functionality merely to avoid understanding an existing implementation.
- Prefer editing the authoritative module rather than patching symptoms at multiple call sites.
- Keep comments concise and useful; do not narrate obvious code.
- Do not add abstractions, wrappers, repositories, factories, generic utility layers, or caching layers unless they remove demonstrated duplication, enforce an important invariant, or materially reduce I/O/latency.
- Avoid speculative refactoring unrelated to the current task.
- Do not perform broad formatting changes while fixing an isolated bug.
- After a change, validate affected behavior with the narrowest relevant test or diagnostic before running broader validation.

## 5. Verified Project Architecture
The application is a Google Apps Script web application backed by Google Sheets.

Known backend/core files include:
- `01_Config.gs` — central configuration and application constants.
- `03_Database.gs` — shared spreadsheet/database access and persistence behavior.
- `13_ForumContatoService.gs` — Forum contact business/service layer.
- `14_ForumAPI.gs` — Forum-facing API boundary exposed to callers/frontend.
- `15_ForumInstallation.gs` — installation/setup/migration support for Forum V4.
- `16_ForumV4Integration.gs` — V4 integration, compatibility, and validation-related behavior.

Known frontend files include:
- `index.html` — primary web-app page.
- `APIJS.html` — frontend JavaScript/API interaction layer.
- `ForumNavigationJS.html` — Forum navigation and frontend behavior.

Supporting documentation:
- `README.md`

Respect the existing separation:
- Configuration belongs in configuration modules.
- Spreadsheet persistence belongs in backend `.gs` modules.
- Forum business rules belong in the Forum service/integration layer.
- Public server endpoints belong in API-oriented `.gs` modules.
- DOM rendering, navigation, UI state, and browser interaction belong in HTML/JS frontend files.
- Frontend code must never receive direct Spreadsheet objects, ranges, internal authorization objects, or unnecessary backend-only data.

## 6. Performance and Quality
- Keep Google Apps Script execution limits in mind; prefer batch operations such as `getValues()` and `setValues()` over reading/writing cells repeatedly.
- Before final execution, check for edge cases, missing parameters, malformed payloads, invalid foreign keys, duplicate records, and potential runtime crashes.
- Use `LockService` when a server operation performs a read-modify-write sequence or generates IDs/inserts rows that could collide under concurrent requests.
- Ultra-Low Latency CRUD: Enforce batch operations to minimize SpreadsheetApp read/write calls. Never interact with spreadsheet cells inside loops when the same operation can be expressed as one range read or batch write.
- Low-Latency Authentication & F5 Reloads: Utilize `CacheService` where appropriate to cache sessions, permissions, reference data, and expensive dropdown datasets rather than repeatedly scanning sheets during initialization.
- Asynchronous UI & Map Rendering: Implement non-blocking frontend data fetching so the page shell and authentication state can render independently from expensive secondary datasets or geographic/map content.
- Minimize Server Roundtrips: Avoid chains of consecutive `google.script.run` calls when the data can safely and maintainably be returned through one cohesive server request.
- Clean Architecture: Strictly isolate backend data operations (`.gs`) from frontend rendering logic and assets (`.html` / `JS.html`).

Performance is not permission to sacrifice correctness or maintainability:
- Optimize SpreadsheetApp I/O first because remote spreadsheet access is normally more expensive than ordinary in-memory JavaScript operations.
- Do not replace readable linear transformations with complex micro-optimizations unless profiling demonstrates a real bottleneck.
- Prefer one bulk sheet read followed by in-memory filtering/indexing to several repeated sheet reads.
- Reuse a dataset already loaded during the same server execution instead of fetching the same range again.
- Build lookup maps with stable IDs for repeated joins instead of repeatedly scanning arrays.
- Write modified rows/ranges in batches.
- Avoid `appendRow()` for concurrency-sensitive or high-volume insert workflows when controlled batched writes are possible.
- Never call `getRange()`, `getValue()`, `setValue()`, `appendRow()`, or equivalent Spreadsheet service operations once per item inside a data-processing loop when batching is possible.
- Avoid calling `getDataRange()` indiscriminately on large sheets if the required range can be bounded using known headers/columns and the actual last row.
- Do not cache data solely because it can be cached. Cache only values whose reuse produces meaningful latency reduction.
- Large cache payloads must be bounded and must not duplicate the complete database.

## 7. Concurrency, Idempotency, and Duplicate Prevention
Every create/update/delete operation must be safe against simultaneous requests, browser double-clicks, retries, F5 reload behavior, and duplicated frontend requests.

For concurrency-sensitive writes:
1. Validate and normalize the request before obtaining the lock whenever validation does not depend on mutable spreadsheet state.
2. Acquire the appropriate `LockService` lock immediately before the critical read-modify-write section.
3. After acquiring the lock, re-read the authoritative state required for uniqueness or update decisions.
4. Check for an existing equivalent record.
5. Perform the minimum required batched write.
6. Release the lock in a `finally` block.

Do not:
- Perform a duplicate check before acquiring a lock and then assume the result remains valid.
- Generate an ID, release control, and later insert without rechecking authoritative state.
- Depend solely on frontend button disabling for duplicate prevention.
- Depend solely on CacheService for uniqueness.
- use timestamps as the only mechanism preventing duplicate logical rows.

Forum V4 contact idempotency must account for the business identity already represented by the relational contact model. Duplicate detection must normalize the relevant combination of hierarchy and contact data, including as applicable:
- municipality/forum context,
- `FORUM_ID`,
- `UNIDADE_ID`,
- `SETOR_ID`,
- `TIPO`,
- normalized `VALOR`,
- and any other field explicitly required by the established V4 duplicate-key rule.

Normalization must be deterministic:
- trim irrelevant whitespace;
- normalize case where comparison is case-insensitive;
- normalize telephone/contact values according to the existing V4 comparison rules;
- treat missing optional hierarchy IDs consistently;
- never collapse genuinely distinct contacts solely because their human-readable description is similar.

The existing V4 duplicate diagnostics have already demonstrated that multiple rows can resolve to the same normalized logical contact. Therefore, duplicate prevention is a mandatory server-side invariant, not merely a data-cleanup feature.

When an operation is retried with the same logical input, prefer returning the existing logical record or a deterministic no-op result instead of inserting another row.

## 8. Locking Guardrails
Do not lock every function automatically.

Use locks for:
- ID allocation tied to mutable sheet state;
- inserts requiring uniqueness;
- read-modify-write updates;
- deletes/restores whose result depends on current state;
- ordering/reordering operations;
- migrations;
- multi-sheet operations that must remain logically consistent.

Avoid holding a lock while:
- rendering HTML;
- making unrelated expensive computations;
- waiting on frontend activity;
- processing static configuration;
- reading immutable/cacheable reference data when no mutation follows.

Keep the critical section small.

A lock improves consistency but can reduce throughput. Therefore:
- validate first when safe;
- lock only around mutable shared state;
- batch the mutation;
- release immediately.

## 9. CacheService Guardrails
CacheService is an optimization layer, never the authoritative database.

Suitable cache candidates include:
- stable municipality/forum/unit/sector lookup datasets;
- heavy dropdown/reference datasets;
- derived navigation/reference structures;
- expensive data used repeatedly during page initialization;
- authentication/session information where the existing security model permits caching.

TTL rules:
- Up to approximately 6 hours may be used for stable reference datasets where temporary staleness is acceptable.
- Authentication and authorization data must use a TTL appropriate to the security model and must not remain trusted longer merely for speed.
- Protected writes must still perform authoritative authorization checks where required.
- Never allow stale cached permissions to grant access after authoritative access has been revoked.

Cache invalidation:
- Invalidate or version relevant cached reference data after mutations that make it stale.
- Prefer coarse, predictable invalidation over a highly complex dependency graph.
- Never build a large caching subsystem merely to avoid a cheap sheet read.

Do not cache:
- Lock state;
- uniqueness decisions;
- transient write success as proof that a row exists;
- sensitive data unnecessarily;
- complete sheets without a demonstrated need.

## 10. Authentication and Security
Authentication and authorization take precedence over latency.

- Never expose protected server operations solely because a frontend control is hidden.
- Enforce authorization server-side for every protected API endpoint.
- Treat frontend input as untrusted.
- Validate payload shape, IDs, types, required fields, and allowed operations before database mutation.
- Do not accept arbitrary sheet names, column names, ranges, or function names from frontend payloads unless explicitly allowlisted.
- Never use user-supplied strings to dynamically select unrestricted backend functions.
- Return only data required by the UI.
- Do not expose internal stack traces, configuration secrets, spreadsheet IDs, authorization internals, or sensitive exception details to normal users.
- Log enough server-side diagnostic information to identify failures without logging credentials or secrets.
- Do not sacrifice authorization correctness to accelerate F5 reloads.

Cached authentication may accelerate routine checks, but authoritative security rules remain the source of truth.

## 11. Frontend / Server Communication
`google.script.run` calls have real roundtrip cost.

Prefer cohesive APIs:
- One request may return related initialization/reference data when those values are normally needed together.
- Do not create one giant endpoint returning the entire application database.
- Separate independently lazy-loadable expensive data when delaying it improves perceived responsiveness.
- Keep payloads minimal and JSON-serializable.
- Avoid repeatedly returning identical reference lists during the same page session.

For page initialization:
1. Render the lightweight UI shell.
2. Establish the required authentication/session state.
3. Load essential navigation/reference data.
4. Render interactive controls.
5. Fetch expensive secondary datasets asynchronously.
6. Render maps/geographic or other heavy elements after the primary interface is usable.

A faster perceived startup is preferable to blocking the entire UI until every optional dataset finishes loading.

Buttons that initiate writes should be temporarily protected against accidental repeated submission in the frontend, but server-side idempotency remains mandatory.

## 12. Spreadsheet Data Access Pattern
Prefer this pattern:

`SpreadsheetApp access -> one bounded batch read -> in-memory validation/indexing/transformation -> one bounded batch write`

Avoid this pattern:

`loop -> getRange/getValue -> condition -> setValue/appendRow -> repeat`

For joins across the Forum V4 hierarchy:
- Read each required source dataset once.
- Build ID-indexed maps in memory.
- Resolve `FORUM_ID`, `UNIDADE_ID`, and `SETOR_ID` relationships using those maps.
- Do not repeatedly scan entire arrays for every contact when a lookup map is justified.

For large sheets:
- Calculate bounds once.
- Skip empty datasets cleanly.
- Handle header-only sheets.
- Avoid reading unused columns.
- Keep conversions and normalization in memory.

## 13. Forum V4 Integrity Rules
The V4 operational hierarchy is:

`MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS`

Contacts may reference the applicable hierarchy levels through IDs.

Integrity validation must detect, as applicable:
- missing required sheets;
- legacy `TELEFONES` presence where V4 requires its removal;
- malformed headers;
- orphan foreign keys;
- duplicate IDs;
- normalized duplicate contacts;
- invalid active/inactive state;
- inconsistent hierarchy relationships;
- malformed values required by V4;
- migration discrepancies between legacy and V4 datasets.

Do not silently repair ambiguous duplicate data during ordinary CRUD operations.

If duplicates represent identical logical records:
- prevent additional duplicates immediately;
- report existing duplicates through diagnostics;
- deduplicate existing production data only through an explicit controlled cleanup/migration operation.

Do not delete data merely because a normalized duplicate key matches without first determining which record is authoritative and whether references depend on its ID.

## 14. Legacy Compatibility Rules
Forum V4 is the target architecture.

- Do not reintroduce `TELEFONES` as an operational dependency.
- Do not create new functionality against the legacy schema when equivalent V4 data exists.
- Legacy compatibility code must remain isolated and clearly distinguishable from V4 business logic.
- Migration/validation helpers may read legacy data when explicitly required, but normal V4 CRUD must operate on the V4 model.
- Remove obsolete compatibility logic only after proving that no supported caller depends on it.

## 15. Maintainability Guardrails
Prefer:
- clear functions with one coherent responsibility;
- explicit domain terminology;
- existing project naming conventions;
- centralized constants;
- shared normalization functions;
- small service/API boundaries;
- deterministic data transformations;
- straightforward arrays/maps and batch operations.

Avoid:
- premature generic frameworks;
- deeply nested callback logic;
- enormous multi-purpose functions;
- duplicate normalization logic;
- duplicated authorization logic;
- magic sheet names scattered through the codebase;
- hidden coupling between UI elements and spreadsheet column positions;
- repeated transformations implemented independently in backend and frontend.

Performance-sensitive code must remain understandable enough that another engineer can verify its correctness without reconstructing an unnecessarily clever algorithm.

## 16. Error Handling and Diagnostics
Do not use exception handling to conceal data corruption.

Server operations should distinguish among:
- validation failure;
- authentication failure;
- authorization failure;
- missing record;
- duplicate/conflict;
- integrity violation;
- temporary system failure;
- unexpected internal failure.

Frontend-facing errors should be concise and safe.

Diagnostic logs may contain:
- operation/function name;
- relevant non-sensitive record ID;
- validation stage;
- row counts;
- elapsed time for suspected bottlenecks;
- normalized duplicate count;
- success/failure category.

Do not log entire datasets merely to debug one row.

During performance diagnosis, add a small number of timing logs around suspected boundaries instead of widespread permanent logging.

## 17. Validation After Changes
Run the narrowest relevant validation first.

For Forum V4 architectural/data changes, use the applicable existing diagnostics:
- `validarArquiteturaForum`
- `validarDadosReaisForumV4API`
- `validarIntegridadeForumV4`

Before declaring a CRUD change complete, verify:
- normal successful operation;
- duplicate/retry behavior;
- invalid input;
- missing record;
- authorization;
- concurrent or repeated submission where applicable;
- empty/header-only datasets;
- relational integrity;
- cache invalidation where relevant.

Do not confuse an editor execution that reports `É necessário estar autenticado.` with successful business-data validation. Resolve or account for the authentication context before interpreting that test.

## 18. Performance Acceptance Standard
The goal is not theoretical minimum latency at any cost.

The application must achieve a balanced production standard:
- no unnecessary SpreadsheetApp calls;
- no cell-by-cell I/O loops;
- no redundant full-sheet scans in one request;
- no unnecessary frontend/server roundtrips;
- no blocking of initial UI on optional heavy data;
- no unsafe cache shortcuts;
- no data races;
- no duplicate logical inserts;
- no unnecessary locks;
- no giant cache architecture;
- no unreadable micro-optimizations;
- no security regression for faster reloads;
- no architectural duplication merely for speed.

Prioritize in this order when requirements conflict:

1. Data integrity and authorization.
2. Correctness and idempotency.
3. User-visible responsiveness and efficient SpreadsheetApp I/O.
4. Clear, maintainable architecture.
5. Token-efficient development and diagnostics.
6. Micro-optimization.

Security and integrity may never be traded for latency.

Maintainability may be traded only when a measured performance bottleneck justifies the added complexity.

## 19. Token Economy
During development:
- Do not restate the user's request.
- Do not reproduce unchanged source files.
- Do not dump entire spreadsheets.
- Do not output full code after editing the workspace.
- Do not explain routine syntax unless explicitly requested.
- Inspect only relevant files/ranges first.
- Summarize large files before bringing additional content into context.
- Search for symbols and dependencies instead of repeatedly reading entire files.
- Reuse facts already established in the conversation/workspace.
- Do not produce multiple speculative solutions.
- Diagnose first, then implement the single selected solution.
- Keep completion reports extremely short.

A normal successful implementation response should contain only:
- files changed;
- essential behavioral change;
- validation performed;
- any remaining concrete risk/blocker.

## 20. Final Engineering Rule
You must ensure that the Google Apps Script web application remains fast and responsive for authentication, F5/page initialization, CRUD operations, navigation, and heavy asynchronous UI/map rendering while simultaneously preserving server-side authorization, relational integrity, concurrency safety, idempotency, and readable maintainable code.

Do not optimize blindly.

Measure or identify the actual expensive boundary, eliminate unnecessary remote I/O and roundtrips, batch spreadsheet operations, cache only appropriate reusable data, keep critical locks short, enforce server-side duplicate prevention, and preserve the existing Forum V4 module boundaries.

The fastest implementation is not acceptable if it can create duplicate rows, stale authorization, corrupted relationships, or code that is disproportionately difficult to maintain.
