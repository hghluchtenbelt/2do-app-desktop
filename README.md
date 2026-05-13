# 2Do-list for Windows desktop 

A lightweight to-do list app for Windows with local file-based data storage, project organization, weekly timeline and stats

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-green)
![License](https://img.shields.io/badge/license-MIT-purple)

## Features

- **Projects** — Organize tasks into color-coded projects with custom icons (60+ to choose from)
- **Priorities** — Normal, Medium, High with visual indicators and smart sorting
- **Smart Ordering** — Overdue → Soon → Priority → Date (no manual sorting needed)
- **Timeline** — Weekly view grouped by project, showing due dates and subtasks
- **Subtasks & Links** — Break tasks into checkable steps, attach URLs or file paths
- **Statistics** — Daily completion charts, time tracking, productivity by project
- **Urgency Alerts** — Visual warnings for overdue (red) and due-soon (yellow) tasks
- **Drag & Drop** — Reorder projects in the sidebar
- **Local Storage** — All data saved as JSON locally (no cloud, no sync, no tracking)

## Installation

### Prerequisites
- Python 3.10 or higher
- Windows 10/11

### Option 1: Run from source

```bash
# Clone the repository
git clone https://github.com/hghluchtenbelt/2do-app-desktop.git
cd 2do-app-desktop

# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

### Option 2: Build a standalone executable

```bash
# Build the .exe
pyinstaller app.spec --clean

# Run it
./dist/app/app.exe
```

The built executable is fully self-contained — share the `dist/app/` folder and others can run `app.exe` without installing Python.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML / CSS / JavaScript (no frameworks) |
| **Backend** | Python (built-in `http.server` + `socketserver`) |
| **Desktop Shell** | PyQt6 + QWebEngineView (Chromium-based) |
| **Build** | PyInstaller (single-folder bundle) |
| **Storage** | Local JSON file |
| **Effects** | [canvas-confetti](https://github.com/catdad/canvas-confetti) for completion animations |

## Data Storage

All data is stored locally in:

```
%APPDATA%\2do-app\data\todos.json
```

The file uses atomic writes (temp file + rename) to prevent corruption. Back up this file to preserve your tasks.

## Project Structure

```
2do-app-desktop/
├── app.py              # HTTP server + PyQt6 desktop window
├── app.spec            # PyInstaller build config
├── make_icon.py        # Helper script to regenerate the app icon
├── public/
│   ├── index.html      # Full UI (HTML + CSS + JS in one file)
│   └── icon.ico        # App icon
└── README.md
```

## Customization

- **Default projects** — Edit `getDefaultProjects()` in `public/index.html`
- **App icon** — Replace `public/icon.ico` or run `python make_icon.py`
- **Window size** — Edit `window.setGeometry(...)` in `app.py`
- **Server port** — Change `PORT = 1000` in `app.py`

## License

MIT — Use freely, modify, and distribute.
