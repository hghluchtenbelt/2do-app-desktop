#!/usr/bin/env python3
import sys, os, json, time, socket, shutil, threading
import http.server
from http.server import ThreadingHTTPServer
from pathlib import Path

BASE_DIR = sys._MEIPASS if getattr(sys, 'frozen', False) else os.path.dirname(__file__)
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')

# Store data under %APPDATA% on Windows, falling back to the home directory.
_APPDATA = os.environ.get('APPDATA')
DATA_DIR = os.path.join(_APPDATA, '2do-app', 'data') if _APPDATA \
    else os.path.join(Path.home(), 'AppData', 'Roaming', '2do-app', 'data')
DATA_FILE = os.path.join(DATA_DIR, 'todos.json')
os.makedirs(DATA_DIR, exist_ok=True)

# Fixed loopback port used only as a single-instance lock / focus channel.
LOCK_PORT = 49731
# Filled once the data server's real port is known; used to reject cross-origin API calls.
ALLOWED_HOSTS = set()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _api_allowed(self):
        # Only our own page (matching host, and same-origin when Origin is sent)
        # may touch the data API. Blocks a drive-by local web page from reading
        # or overwriting the data file.
        host = self.headers.get('Host')
        if host is not None and host not in ALLOWED_HOSTS:
            return False
        origin = self.headers.get('Origin')
        if origin is not None and origin not in {f'http://{h}' for h in ALLOWED_HOSTS}:
            return False
        return True

    def _send_json(self, status, body):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(body)

    def _quarantine_corrupt(self):
        # Quarantine an unreadable file so the next save doesn't overwrite
        # data that may still be recoverable (e.g. a truncated write).
        try:
            if os.path.exists(DATA_FILE) and os.path.getsize(DATA_FILE) > 0:
                backup = DATA_FILE + '.corrupt-' + time.strftime('%Y%m%d-%H%M%S')
                os.replace(DATA_FILE, backup)
                print(f"Quarantined unreadable data file to {backup}", file=sys.stderr)
                return True
        except Exception as be:
            print(f"Quarantine error: {be}", file=sys.stderr)
        return False

    def do_GET(self):
        if self.path == '/api/load-data':
            if not self._api_allowed():
                self.send_error(403, 'Forbidden')
                return
            try:
                if os.path.exists(DATA_FILE) and os.path.getsize(DATA_FILE) > 0:
                    # utf-8-sig tolerates a BOM (e.g. if hand-edited in Notepad).
                    with open(DATA_FILE, 'r', encoding='utf-8-sig') as f:
                        data = json.load(f)
                else:
                    data = {'todos': [], 'projects': []}
                self._send_json(200, json.dumps(data, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                print(f"Load error: {e}", file=sys.stderr)
                data_error = self._quarantine_corrupt()
                fallback = {'todos': [], 'projects': [], '_dataError': data_error}
                self._send_json(200, json.dumps(fallback).encode('utf-8'))
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/open':
            if not self._api_allowed():
                self.send_error(403, 'Forbidden')
                return
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                target = json.loads(body.decode()).get('target')
                if not isinstance(target, str) or not target.strip():
                    raise ValueError("Missing target")
                open_target(target.strip())
                self._send_json(200, b'{"success":true}')
            except Exception as e:
                self._send_json(400, json.dumps({"success": False, "error": str(e)}).encode())
            return

        if self.path == '/api/save-data':
            if not self._api_allowed():
                self.send_error(403, 'Forbidden')
                return
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                # Validate body is non-empty and valid JSON
                if not body or content_length == 0:
                    raise ValueError("Empty body")
                payload = json.loads(body.decode())
                if not isinstance(payload, dict):
                    raise ValueError("Invalid format")
                # Require the expected shape so a malformed payload can't wipe tasks
                if not isinstance(payload.get('todos'), list) or not isinstance(payload.get('projects'), list):
                    raise ValueError("Payload must contain 'todos' and 'projects' lists")

                os.makedirs(DATA_DIR, exist_ok=True)
                # Snapshot the last-good file before overwriting (one per day, keep 7).
                write_daily_backup()
                # Atomic write: write to temp file then rename
                tmp_file = DATA_FILE + '.tmp'
                with open(tmp_file, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                os.replace(tmp_file, DATA_FILE)

                self._send_json(200, b'{"success":true}')
            except Exception as e:
                self._send_json(400, json.dumps({"success": False, "error": str(e)}).encode())
            return
        super().do_POST()

    def log_message(self, format, *args):
        pass


def write_daily_backup(keep=7):
    """Keep one snapshot of todos.json per day under DATA_DIR/backups, pruning
    to the newest `keep` days. Cheap insurance against a bad save or edit."""
    try:
        if not (os.path.exists(DATA_FILE) and os.path.getsize(DATA_FILE) > 0):
            return
        backup_dir = os.path.join(DATA_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        dest = os.path.join(backup_dir, 'todos-' + time.strftime('%Y-%m-%d') + '.json')
        if not os.path.exists(dest):
            shutil.copy2(DATA_FILE, dest)
        backups = sorted(f for f in os.listdir(backup_dir)
                         if f.startswith('todos-') and f.endswith('.json'))
        for old in backups[:-keep]:
            try:
                os.remove(os.path.join(backup_dir, old))
            except OSError:
                pass
    except Exception as e:
        print(f"Backup error: {e}", file=sys.stderr)


def open_target(target):
    """Open a URL in the default browser, or a file/folder with its default app."""
    if target.lower().startswith(('http://', 'https://', 'mailto:')):
        import webbrowser
        webbrowser.open(target)
    elif sys.platform.startswith('win'):
        os.startfile(target)  # noqa: only exists on Windows
    elif sys.platform == 'darwin':
        import subprocess
        subprocess.Popen(['open', target])
    else:
        import subprocess
        subprocess.Popen(['xdg-open', target])


def acquire_single_instance():
    """Bind a fixed loopback port as a lock. Returns the listening socket if
    we are the only instance, or None if another instance already holds it."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('127.0.0.1', LOCK_PORT))
        s.listen(1)
        return s
    except OSError:
        s.close()
        return None


def notify_existing_instance():
    """Poke the already-running instance so it can focus its window."""
    try:
        with socket.create_connection(('127.0.0.1', LOCK_PORT), timeout=1):
            pass
    except OSError:
        pass


def start_data_server():
    """Serve the app and data API on an OS-assigned free port (avoids the
    fixed-port clash where a second instance hijacked the first's server)."""
    httpd = ThreadingHTTPServer(('localhost', 0), Handler)
    port = httpd.server_address[1]
    ALLOWED_HOSTS.update({f'localhost:{port}', f'127.0.0.1:{port}'})
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return port


def main():
    lock = acquire_single_instance()
    if lock is None:
        # Another instance owns the lock; ask it to surface and exit.
        notify_existing_instance()
        print("2Do List is already running.", file=sys.stderr)
        return

    port = start_data_server()
    time.sleep(0.3)

    try:
        from PyQt6.QtWidgets import QApplication, QMainWindow, QSystemTrayIcon, QMenu
        from PyQt6.QtWebEngineWidgets import QWebEngineView
        from PyQt6.QtCore import QUrl, QObject, pyqtSignal, QSettings, QTimer
        from PyQt6.QtGui import QIcon
    except ImportError:
        import webbrowser
        webbrowser.open(f'http://localhost:{port}')
        while True:
            time.sleep(1)

    class MainWindow(QMainWindow):
        tray = None

        def changeEvent(self, event):
            # F6: minimizing hides the window to the tray when a tray exists.
            if event.type() == event.Type.WindowStateChange and self.isMinimized() and self.tray:
                event.ignore()
                self.hide()
                return
            super().changeEvent(event)

    app = QApplication(sys.argv)
    # A QIcon that loads a file must be created after QApplication exists.
    icon_path = os.path.join(BASE_DIR, 'public', 'icon.ico')
    icon = QIcon(icon_path) if os.path.exists(icon_path) else QIcon()
    window = MainWindow()
    window.setWindowTitle('2Do List')
    if not icon.isNull():
        window.setWindowIcon(icon)

    # F10: restore the last window geometry, persist it on quit.
    qsettings = QSettings('2do-app', '2Do List')
    geo = qsettings.value('geometry')
    if geo is not None:
        try:
            window.restoreGeometry(geo)
        except Exception:
            window.setGeometry(100, 100, 1000, 800)
    else:
        window.setGeometry(100, 100, 1000, 800)
    app.aboutToQuit.connect(lambda: qsettings.setValue('geometry', window.saveGeometry()))

    browser = QWebEngineView()
    browser.load(QUrl(f'http://localhost:{port}'))
    window.setCentralWidget(browser)
    window.show()

    def surface():
        window.showNormal()
        window.raise_()
        window.activateWindow()

    # F6: system tray icon with quick actions and due-task notifications.
    tray = None
    try:
        if QSystemTrayIcon.isSystemTrayAvailable():
            tray = QSystemTrayIcon(icon, app)
            tray.setToolTip('2Do List')
            menu = QMenu()
            menu.addAction('Show').triggered.connect(surface)
            menu.addAction('Quit').triggered.connect(app.quit)
            tray.setContextMenu(menu)
            tray.activated.connect(
                lambda reason: surface() if reason == QSystemTrayIcon.ActivationReason.Trigger else None)
            tray.show()
            window.tray = tray
    except Exception as e:
        print(f"Tray error: {e}", file=sys.stderr)

    notified = set()

    def check_due():
        if tray is None:
            return
        try:
            if not (os.path.exists(DATA_FILE) and os.path.getsize(DATA_FILE) > 0):
                return
            with open(DATA_FILE, encoding='utf-8') as f:
                todos = json.load(f).get('todos', [])
            today = time.strftime('%Y-%m-%d')
            due = [t for t in todos
                   if not t.get('completed') and t.get('dueDate') and t['dueDate'] <= today
                   and t.get('id') not in notified]
            for t in due:
                notified.add(t.get('id'))
            if due:
                titles = ', '.join(t.get('title', '(untitled)') for t in due[:3])
                more = '' if len(due) <= 3 else f' +{len(due) - 3} more'
                tray.showMessage('2Do: tasks due', titles + more,
                                 QSystemTrayIcon.MessageIcon.Information, 8000)
        except Exception as e:
            print(f"Due-check error: {e}", file=sys.stderr)

    due_timer = QTimer()
    if tray is not None:
        due_timer.timeout.connect(check_due)
        due_timer.start(60000)
        QTimer.singleShot(3000, check_due)

    # When a second launch pokes the lock port, raise this window to the front.
    class Focuser(QObject):
        ping = pyqtSignal()

    focuser = Focuser()
    focuser.ping.connect(surface)

    def listen_for_pokes():
        while True:
            try:
                conn, _ = lock.accept()
                conn.close()
                focuser.ping.emit()
            except OSError:
                break

    threading.Thread(target=listen_for_pokes, daemon=True).start()

    sys.exit(app.exec())


if __name__ == '__main__':
    main()
