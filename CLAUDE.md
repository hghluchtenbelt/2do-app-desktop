# 2do-app-desktop

Windows desktop to-do app: a local Python HTTP server serving a single-page vanilla JS frontend, wrapped in a PyQt6 QWebEngineView window. Data lives in one local JSON file, no cloud, no accounts.

## Run and build

- Run from source: `pip install -r requirements.txt`, then `python app.py`
- Build the exe: `pyinstaller app.spec --clean`, output in `dist/app/app.exe`
- Regenerate the icon: `python make_icon.py`

## Architecture

- `app.py`: `http.server` on `localhost:1000` with two JSON endpoints (`GET /api/load-data`, `POST /api/save-data`) plus static files from `public/`. The PyQt6 window is just a Chromium view pointed at that URL. When PyInstaller-frozen, assets resolve via `sys._MEIPASS`.
- `public/index.html`: the entire UI in one file (HTML, CSS and JS), no frameworks, no build step.
- Data: `%APPDATA%\2do-app\data\todos.json`, shape `{"todos": [...], "projects": [...]}`. Every save POSTs the whole state; the server writes atomically (temp file, then `os.replace`).

## Conventions

- Vanilla JS only. Keep the UI in `index.html` unless a file split is explicitly agreed.
- No new runtime dependencies without asking first. canvas-confetti is the only frontend library.
- The UI re-renders through `innerHTML` template strings. Any user-entered text (task titles, project names, notes, subtasks, link labels/urls) interpolated into HTML must be escaped.
- Mutation pattern: change `state`, then `saveData()`, then `render()`. Complete the mutation and the save before anything that can throw (see CODE_REVIEW.md B1).
- Data model changes must stay backward compatible with existing `todos.json` files. `loadData()` backfills missing fields with defaults; extend that pattern rather than assuming fields exist.

## Testing and verification

There is no test suite. Verify changes by running `python app.py` and exercising the affected flow in the window. Before risky data-format changes, back up `%APPDATA%\2do-app\data\todos.json`.

## Known quirks

- Fixed port 1000. A second launched instance fails to bind silently and its window attaches to the first instance's server.
- Confetti loads from a CDN, so `confetti` is undefined when offline.
- `CODE_REVIEW.md` holds the current bug and feature backlog with priorities.
