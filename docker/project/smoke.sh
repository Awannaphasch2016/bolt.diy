#!/bin/sh
# Build is separate. This runs a generated-project shaped app inside bolt-project.
set -eu

image="${1:-bolt-project:latest}"
root=$(mktemp -d)
name="bolt-project-smoke-$$"

cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  rm -rf "$root"
}

trap cleanup EXIT

cat > "$root/package.json" <<'EOF'
{
  "name": "bolt-project-smoke",
  "private": true,
  "scripts": {
    "dev": "node server.js"
  },
  "devDependencies": {
    "vite": "6.0.0"
  }
}
EOF

cat > "$root/server.js" <<'EOF'
const http = require('http');
const port = Number(process.env.PORT || 5173);
const args = process.argv.slice(2).join(' ');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end(`bolt-project ok ${args}`);
});
server.listen(port, '0.0.0.0');
EOF

docker rm -f "$name" >/dev/null 2>&1 || true
docker run -d --name "$name" -e INSTALL=never -p 5174:5173 -v "$root":/workspace "$image" dev

i=0
while [ "$i" -lt 20 ]; do
  body=$(curl -fsS http://127.0.0.1:5174/ 2>/dev/null || true)

  if printf '%s' "$body" | grep -q 'bolt-project ok --host 0.0.0.0 --port 5173'; then
    echo "bolt-project smoke test passed"
    exit 0
  fi

  i=$((i + 1))
  sleep 1
done

echo "bolt-project smoke test failed" >&2
docker logs "$name" >&2 || true
exit 1
