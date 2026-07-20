#!/usr/bin/env python3
"""Range 요청 지원 로컬 HTTP 서버 (video seek 위해 필요)."""
import http.server
import socketserver
import os
import re
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8878


class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        f = None
        if os.path.isdir(path):
            parts = self.path.split('?', 1)
            if not parts[0].endswith('/'):
                self.send_response(301)
                new_url = parts[0] + '/'
                if len(parts) > 1:
                    new_url += '?' + parts[1]
                self.send_header("Location", new_url)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
            for index in ("index.html", "index.htm"):
                idx = os.path.join(path, index)
                if os.path.exists(idx):
                    path = idx
                    break
            else:
                return self.list_directory(path)

        ctype = self.guess_type(path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        try:
            fs = os.fstat(f.fileno())
            size = fs.st_size
            range_header = self.headers.get('Range')
            if range_header:
                m = re.match(r'bytes=(\d+)-(\d*)', range_header)
                if m:
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else size - 1
                    end = min(end, size - 1)
                    length = end - start + 1
                    self.send_response(206)
                    self.send_header('Content-Type', ctype)
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
                    self.send_header('Content-Length', str(length))
                    self.send_header('Last-Modified', self.date_time_string(fs.st_mtime))
                    self.end_headers()
                    f.seek(start)
                    self._remaining = length
                    return f
            self.send_response(200)
            self.send_header("Content-type", ctype)
            self.send_header("Content-Length", str(size))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            self.end_headers()
            self._remaining = None
            return f
        except Exception:
            f.close()
            raise

    def copyfile(self, source, outputfile):
        remaining = getattr(self, '_remaining', None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        chunk = 64 * 1024
        while remaining > 0:
            data = source.read(min(chunk, remaining))
            if not data:
                break
            outputfile.write(data)
            remaining -= len(data)


os.chdir(os.path.dirname(os.path.abspath(__file__)))
with socketserver.TCPServer(("", PORT), RangeHTTPRequestHandler) as httpd:
    httpd.allow_reuse_address = True
    print(f"Range-enabled HTTP server on http://localhost:{PORT}/")
    httpd.serve_forever()
