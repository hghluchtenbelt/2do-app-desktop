# Code review: 2do-app-desktop

Reviewed: 2026-07-08, commit `1a67907`. Scope: `app.py`, `public/index.html`, `app.spec`, `make_icon.py`.

**Progress:** Slice 0 (B1, B10, B4, B5) done on branch `slice-0-data-safety`.
Slice 1 (B2, B6, B7, B8, B9, B11, B12, B13) done on branch `slice-1-correctness`.
Slice 2 (B3, B16, B17, B18, B19) done on branch `slice-2-robustness`.
Slice 3 (R1 file split, R4 debounce) done on branch `slice-3-structure`. R3 (event delegation) intentionally deferred: high-churn rewrite of all event binding with no user-visible benefit and real regression risk at this app's scale; revisit only if render-time listener churn becomes a measured problem.
Slice 4 (F1 search, F4 project archive, F3 clickable links, F9 shortcuts) done on branch `slice-4-features`.
Slice 5 (F2 backups + export/import, F7 recurring, F12 auto-cleanup, F10 window state, F6 tray + due notifications) done on branch `slice-5-features`; also hardened data load to tolerate a UTF-8 BOM. Remaining slice-5 items intentionally deferred: F5 dark mode (needs a real palette pass over many hardcoded gradients + design sign-off), F8 manual task ordering (conflicts with the advertised smart-sort; needs a product decision on manual-vs-smart), F11 bulk actions (larger multi-select UI). None are blockers; each is a clean standalone follow-up.

Severity: **Critical** (data loss or broken core flow), **High** (wrong behavior users will hit), **Medium** (wrong in edge cases), **Low** (polish, hardening).

---

## 1. Bugs (fix)

### B1. Critical: completing a task offline is never saved [DONE, slice 0]
`index.html:1004-1014` and `1056-1062`. `fireConfetti()` runs before `saveData()`. Confetti comes from a CDN (`index.html:7`), so offline `confetti` is undefined, `fireConfetti()` throws a ReferenceError, and the `saveData()` + `render()` after it never run. The task looks unchanged, and the in-memory completion is lost on close. This is a desktop app that should work offline.
Fix: vendor `confetti.browser.min.js` into `public/`, wrap the call in `if (typeof confetti === 'function')`, and always call `saveData()` before any cosmetic effect.

### B2. High: user text is injected into innerHTML unescaped [DONE, slice 1]
Task titles (`index.html:896, 925`), project names (`536, 625, 866`), subtask text (`1322`), link labels and urls (`1363-1364`), and stats project names (`763`) are interpolated into template strings without escaping. A title containing `<` breaks rendering; `<img src=x onerror=...>` executes script inside the app. Local-only, so low exploitability, but it corrupts display with ordinary input like `a < b`.
Fix: add one `escapeHtml()` helper and use it at every interpolation of user-entered text.

### B3. High: second launch silently attaches to the first instance [DONE, slice 2]
`app.py:5, 71-75`. The port is fixed at 1000 and the bind error from a second instance dies inside the daemon thread unnoticed. The second window then loads the first instance's server. Two windows now each POST the whole state, so the last saver wins and the other window's edits are silently destroyed. Closing the first instance leaves the second window with a dead backend.
Fix: detect the failed bind and either focus/exit with a message ("already running"), or pick a free port (`port=0`, read the assigned port, pass it to `QUrl`).

### B4. Medium: a corrupt data file gets overwritten by the next save [DONE, slice 0]
`app.py:28-33`. If `todos.json` is corrupt, load-data returns empty state. The client then treats empty as truth and the first save overwrites the corrupt file, destroying data that was likely recoverable (e.g. truncated JSON).
Fix: on parse failure, rename the file to `todos.json.corrupt-<timestamp>` before returning empty, and tell the client so it can show a warning.

### B5. Medium: save endpoint accepts any dict [DONE, slice 0]
`app.py:45-47`. Validation only checks `isinstance(payload, dict)`. A payload like `{"a": 1}` is written verbatim and wipes all tasks on next load.
Fix: require `todos` and `projects` keys, both lists, before writing.

### B6. Medium: timeline weeks 10+ sort before week 2 [DONE, slice 1]
`index.html:820, 828`. Week keys are `"2026-W9"`, `"2026-W10"` and sorted lexicographically, so W10-W19 sort between W1 and W2.
Fix: zero-pad (`W09`) or sort numerically.

### B7. Medium: timeline "Today" badge only compares day of month [DONE, slice 1]
`index.html:884`. `day === today.getDate()` marks a task due Aug 8 as "Today" on Jul 8.
Fix: compare `t.dueDate === todayStr()`.

### B8. Medium: week number and week range are inconsistent and non-ISO [DONE, slice 1]
`index.html:809-813` computes a rough Jan-1-based week number; `832-836` builds a Monday-based range. For Sunday due dates, `d.getDate() - d.getDay() + 1` lands on the *next* Monday, so the displayed range doesn't contain the task's date. Year boundaries misgroup too.
Fix: one proper ISO-week helper used for both the key and the range.

### B9. Medium: priority edits in the task modal bypass Cancel [DONE, slice 1]
`index.html:1413-1423`. Clicking a priority button mutates the task and saves immediately, while title, notes, date, and project only apply on Save. Closing with ✕ keeps the priority change, which reads as a bug.
Fix: stage the priority in a variable and apply it in the Save handler.

### B10. Low: failed saves are invisible to the user [DONE, slice 0]
`index.html:515-517`. A failed POST only logs to console; the user keeps working and loses everything on close.
Fix: `showToast('Could not save', 'error')` in the catch, ideally with a retry.

### B11. Low: time-spent prompt accepts garbage [DONE, slice 1]
`index.html:1003-1006, 1056-1059`. `"-30"` or `"1e99"` pass `!isNaN`, storing negative or absurd minutes that skew stats.
Fix: `const m = parseInt(v, 10); if (Number.isFinite(m) && m > 0 && m < 1440) ...`

### B12. Low: unchecking a task discards its logged time [DONE, slice 1]
`index.html:1009-1011`. Un-completing deletes `completedAt` and `timeSpent`, so an accidental uncheck+recheck forces re-entering the time.
Fix: keep `timeSpent`, only clear `completedAt`.

### B13. Low: task can be saved with an empty title [DONE, slice 1]
`index.html:1429`. The edit modal trims but doesn't validate, producing invisible tasks.
Fix: reject empty with a toast, like the project modal does.

### B14. Low: deleting a project leaves dangling projectIds
`index.html:573-577`. Tasks keep a `projectId` that resolves to nothing; they show no badge and can never be filtered again except via All Tasks.
Fix: set `projectId = null` on affected tasks when the project is deleted.

### B15. Low: custom date picker may not open
`index.html:304, 1244-1248`. `showPicker()` is called on a `display:none` input; Chromium throws NotSupportedError for non-rendered elements in several versions, and the `click()` fallback does nothing on a hidden input. Needs a quick manual test in the QWebEngine build.
Fix if it reproduces: make the input visually hidden (1x1, opacity 0) instead of `display:none`.

### B16. Low: cross-origin pages can write to the data API [DONE, slice 2]
`app.py:37-66`. A malicious page in any local browser can `fetch('http://localhost:1000/api/save-data', {method:'POST', headers:{'Content-Type':'text/plain'}, body: json})`. `text/plain` avoids the CORS preflight and the server parses the body regardless of content type, so tasks can be overwritten by a drive-by page.
Fix: reject requests whose `Origin`/`Host` isn't `localhost:1000`, or require a random token generated at startup and embedded in the page.

### B17. Low: portability details in app.py [DONE, slice 2 (%APPDATA%; port now dynamic)]
`app.py:5, 8`. Port 1000 is in the privileged range on macOS/Linux, and the data dir hardcodes `AppData/Roaming` via `Path.home()` instead of `%APPDATA%`. Windows-only today, but cheap to fix while touching B3.

### B18. Low: single-threaded server [DONE, slice 2]
`app.py:72`. `socketserver.TCPServer` handles one request at a time; a slow request stalls the UI's fetches. Swap in `http.server.ThreadingHTTPServer` (one-line change).

### B19. Chore: dead code [DONE, slice 2]
`index.html:1019` binds click handlers for `.timeline-item, .gantt-bar`, selectors that no longer exist. Remove.

---

## 2. Features (feat), roughly by value/effort

1. **F1 Search and filter. [DONE, slice 4]** A text box above the task list filtering title/notes/subtasks live. Highest daily value, small effort.
2. **F2 Backup and export/import. [DONE, slice 5]** "Export JSON" / "Import JSON" buttons plus server-side rotating backups (one snapshot of `todos.json` per day on save, keep newest 7). Pairs with B4.
3. **F3 Clickable links. [DONE, slice 4]** Links on a task are currently plain text. URLs open in the default browser and file paths via a new `POST /api/open` endpoint using `os.startfile()` (QWebEngine won't open external apps or `file://` well on its own).
4. **F4 Project archive UI. [DONE, slice 4]** The data model already has `archived` on projects and every filter respects it, but there was no way to set it. Added "Archive/Unarchive" to the project edit modal, plus a collapsible "Archived" section in the sidebar to restore from.
5. **F5 Dark mode. [DEFERRED]** CSS variables are already in `:root`; add a toggle persisted in the data file and a dark variable set. Note many colors are hardcoded gradients outside the variables, so budget cleanup time.
6. **F6 Due-date notifications and tray. [DONE, slice 5]** QSystemTrayIcon with minimize-to-tray and a Windows toast when tasks become due/overdue. Makes due dates actionable instead of decorative.
7. **F7 Recurring tasks. [DONE, slice 5]** `repeat: daily|weekly|monthly` on a task; completing it spawns the next occurrence. (Monthly uses JS date math, so end-of-month dates can roll into the following month.)
8. **F8 Manual task ordering. [DEFERRED]** Drag to reorder within a section (projects already have this pattern to copy). Conflicts with the smart-sort; needs a product decision.
9. **F9 Keyboard shortcuts. [DONE, slice 4]** `n` focus new task, `/` focus search, `1..4` switch tabs, `Esc` close modal.
10. **F10 Window state persistence. [DONE, slice 5]** Remember size/position via QSettings (`app.py`).
11. **F11 Bulk actions. [DEFERRED]** Multi-select tasks to move project, set date, or delete.
12. **F12 Archive auto-cleanup. [DONE, slice 5]** Setting to purge completed tasks older than N days.

---

## 3. Refactors (won't change behavior)

- **R1 [DONE, slice 3]** Split `index.html` into `index.html` + `style.css` + `app.js`. Still no build step, just three files.
- **R2 [DONE, slice 1]** One `escapeHtml()` helper used everywhere (landed with B2).
- **R3 [DEFERRED]** Event delegation: one listener per container instead of re-binding every button on each render. Deferred, see Progress note.
- **R4 [DONE, slice 3]** Debounce `saveData()` (250 ms) so subtask checkbox sprees don't fire a POST each; a pending save is flushed via `sendBeacon` on page hide/close so nothing is lost.

---

## 4. Action plan in slices

Each slice is one small PR/commit, verified by running `python app.py` and exercising the flow.

**Slice 0, data safety (do first): B1, B10, B4, B5. [DONE]**
Vendor confetti locally, reorder save-before-effects, toast on save failure, corrupt-file quarantine, payload validation. Small diffs, removes all silent data loss paths.

**Slice 1, correctness: B2, B6, B7, B8, B9, B11, B12, B13. [DONE]**
Escaping helper, ISO week fix, today-badge fix, modal consistency, input validation.

**Slice 2, robustness: B3, B16, B17, B18, B19. [DONE]**
Single-instance handling with dynamic port, origin check on the API, ThreadingHTTPServer, `%APPDATA%`, dead-code removal. All in `app.py` plus one `QUrl` line.

**Slice 3, structure: R1, R4 [DONE]; R3 deferred.**
File split and save debounce, before features pile onto the monolith.

**Slice 4, quick-win features: F1 search, F4 project archive, F3 clickable links, F9 shortcuts. [DONE]**

**Slice 5, bigger features: F2 backups, F6 tray/notifications, F7 recurring, F10 window state, F12 auto-cleanup [DONE]; F5 dark mode, F8 ordering, F11 bulk deferred.**

---

## 5. What already looks good

- Atomic writes (temp file + `os.replace`) on the server.
- `dataLoaded` guard preventing a save from racing the initial load.
- Backfilling of missing task fields in `loadData()` keeps old data files working.
- Subtask completion gate with a clear toast, local timezone handling in stats, and the timeline grouping are thoughtful touches.
