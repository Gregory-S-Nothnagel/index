#!/usr/bin/env python3
import argparse
import os
import posixpath
import urllib
from http.server import HTTPServer, SimpleHTTPRequestHandler
from functools import partial

class RangeRequestHandler(SimpleHTTPRequestHandler):
    """
    HTTP/1.1 request handler with:
      - Byte‐range (206 Partial Content) support
      - Ignoring client‐side ConnectionResetErrors
    """
    protocol_version = "HTTP/1.1"

    def handle(self):
        try:
            super().handle()
        except ConnectionResetError:
            # Silently ignore client disconnects
            pass

    def send_head(self):
        """Common code for GET and HEAD commands, with Range support."""
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return self.list_directory(path)

        ctype = self.guess_type(path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        fs = os.fstat(f.fileno())
        size = fs.st_size
        range_header = self.headers.get('Range')

        if range_header:
            # Parse header, e.g. "bytes=500-999"
            units, _, range_spec = range_header.partition('=')
            if units.strip() != 'bytes':
                self.send_error(400, "Invalid Range Unit")
                f.close()
                return None

            start_str, _, end_str = range_spec.partition('-')
            try:
                start = int(start_str) if start_str else 0
                end = int(end_str) if end_str else size - 1
            except ValueError:
                self.send_error(400, "Invalid Range Spec")
                f.close()
                return None

            if start < 0 or end >= size or start > end:
                self.send_error(416, "Requested Range Not Satisfiable")
                f.close()
                return None

            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            self.end_headers()

            f.seek(start)
            return f

        # No Range header — serve entire file
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        return f

    def do_GET(self):
        f = self.send_head()
        if f:
            try:
                self.copyfile(f, self.wfile)
            finally:
                f.close()

    def do_HEAD(self):
        f = self.send_head()
        if f:
            f.close()


def main():
    parser = argparse.ArgumentParser(
        description="Serve a directory over HTTP/1.1 with byte‐range support"
    )
    parser.add_argument("-p", "--port", type=int, default=8000,
                        help="Port to serve on (default: 8000)")
    parser.add_argument("-b", "--bind", type=str, default="127.0.0.1",
                        help="Bind address (default: localhost only)")
    parser.add_argument("-d", "--dir", type=str, default=".",
                        help="Directory to serve (default: current directory)")
    args = parser.parse_args()

    serve_dir = os.path.abspath(args.dir)
    if not os.path.isdir(serve_dir):
        print(f"Error: '{serve_dir}' is not a directory")
        return

    os.chdir(serve_dir)
    handler_class = partial(RangeRequestHandler, directory=serve_dir)
    server = HTTPServer((args.bind, args.port), handler_class)

    print(f"Serving '{serve_dir}' at http://{args.bind}:{args.port}/ "
          f"(HTTP/1.1, byte‐range support)")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server")
        server.server_close()


if __name__ == "__main__":
    main()
