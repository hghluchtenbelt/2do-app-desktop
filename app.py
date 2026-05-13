#!/usr/bin/env python3
import sys, http.server, socketserver, threading, os, json, time
from pathlib import Path

PORT = 1000
BASE_DIR = sys._MEIPASS if getattr(sys, 'frozen', False) else os.path.dirname(__file__)
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
DATA_DIR = os.path.join(Path.home(), 'AppData/Roaming/2do-app/data')
DATA_FILE = os.path.join(DATA_DIR, 'todos.json')
os.makedirs(DATA_DIR, exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/load-data':
            try:
                if os.path.exists(DATA_FILE) and os.path.getsize(DATA_FILE) > 0:
                    with open(DATA_FILE, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                else:
                    data = {'todos': [], 'projects': []}
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                print(f"Load error: {e}", file=sys.stderr)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"todos":[],"projects":[]}')
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/save-data':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                # Validate body is non-empty and valid JSON
                if not body or content_length == 0:
                    raise ValueError("Empty body")
                payload = json.loads(body.decode())
                if not isinstance(payload, dict):
                    raise ValueError("Invalid format")

                os.makedirs(DATA_DIR, exist_ok=True)
                # Atomic write: write to temp file then rename
                tmp_file = DATA_FILE + '.tmp'
                with open(tmp_file, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                os.replace(tmp_file, DATA_FILE)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"success":true}')
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
            return
        super().do_POST()

    def log_message(self, format, *args):
        pass

def run_server():
    with socketserver.TCPServer(('localhost', PORT), Handler) as httpd:
        httpd.serve_forever()

threading.Thread(target=run_server, daemon=True).start()
time.sleep(0.5)

try:
    from PyQt6.QtWidgets import QApplication, QMainWindow
    from PyQt6.QtWebEngineWidgets import QWebEngineView
    from PyQt6.QtCore import QUrl
    from PyQt6.QtGui import QIcon

    app = QApplication(sys.argv)
    window = QMainWindow()
    window.setWindowTitle('2Do List')
    window.setGeometry(100, 100, 1000, 800)

    icon_path = os.path.join(BASE_DIR, 'public', 'icon.ico')
    if os.path.exists(icon_path):
        window.setWindowIcon(QIcon(icon_path))

    browser = QWebEngineView()
    browser.load(QUrl(f'http://localhost:{PORT}'))
    window.setCentralWidget(browser)
    window.show()

    sys.exit(app.exec())
except ImportError:
    import webbrowser
    webbrowser.open(f'http://localhost:{PORT}')
    while True:
        time.sleep(1)
