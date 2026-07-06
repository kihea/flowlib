import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = readPort(process.argv) || Number(process.env.PORT || 5173);
const quiet = process.argv.includes("--quiet");

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"]
]);

function resolveRequestPath(url) {
  const parsed = new URL(url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(parsed.pathname);
  const relative = pathname === "/" ? "/examples/workspace.html" : pathname;
  const resolved = normalize(join(root, relative));
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

const server = createServer((req, res) => {
  const file = resolveRequestPath(req.url || "/");
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": mime.get(extname(file)) || "application/octet-stream"
  });
  createReadStream(file).pipe(res);
});

server.listen(port, () => {
  if (!quiet) {
    console.log(`Flowlib examples: http://localhost:${port}/examples/workspace.html`);
  }
});

function readPort(argv) {
  const flagIndex = argv.indexOf("--port");
  if (flagIndex >= 0 && argv[flagIndex + 1]) {
    return Number(argv[flagIndex + 1]);
  }
  const inline = argv.find((arg) => arg.startsWith("--port="));
  if (inline) {
    return Number(inline.slice("--port=".length));
  }
  return 0;
}
