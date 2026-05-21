import http from "http";

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer((req, res) => {
  const body = {
    app: "execution-commands",
    status: "running",
    path: req.url,
    message:
      "Server is up. Run migration commands from Boltic Execution Commands.",
    commands: {
      "migrate-status": "node scripts/migrate.js status",
      "migrate-up": "node scripts/migrate.js up",
      "migrate-down": "node scripts/migrate.js down",
      "ping": "node scripts/ping.js",
    },
  };

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`execution-commands listening on port ${PORT}`);
});
