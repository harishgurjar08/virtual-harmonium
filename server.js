const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.webm': 'audio/webm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function startServer(port) {
    const server = http.createServer((req, res) => {
        // Parse request URL
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        let pathname = decodeURIComponent(parsedUrl.pathname);

        // Default to index.html
        if (pathname === '/' || pathname === '') {
            pathname = '/index.html';
        }

        // Prevent directory traversal
        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(__dirname, safePath);

        // Security check: ensure path is within directory
        if (!filePath.startsWith(__dirname)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('403 Forbidden');
            return;
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<!DOCTYPE html>
                <html>
                <head><title>404 Not Found</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h2>404 - File Not Found</h2>
                    <p>Could not find <code>${pathname}</code></p>
                    <a href="/">Go to AR Virtual Harmonium</a>
                </body>
                </html>`);
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            // Headers for smooth AR camera & Web Audio support
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*',
                'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
            });

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is in use, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });

    server.listen(port, () => {
        console.log('');
        console.log('\x1b[33m%s\x1b[0m', '  🎵 AR Virtual Harmonium - Development Server');
        console.log('\x1b[36m%s\x1b[0m', `  ➜  Local:   http://localhost:${port}/`);
        console.log('\x1b[90m%s\x1b[0m', `  ➜  Network: http://127.0.0.1:${port}/`);
        console.log('');
        console.log('\x1b[32m%s\x1b[0m', '  Ready! Open the URL above in your browser.');
        console.log('\x1b[90m%s\x1b[0m', '  Press Ctrl+C to stop.');
        console.log('');
    });
}

const requestedPort = parseInt(process.env.PORT, 10) || DEFAULT_PORT;
startServer(requestedPort);
