import http from "http";
import { getSuiteApp } from "@sb/suite";

const suiteApp = getSuiteApp("siteforge");
const port = Number(process.env.PORT ?? suiteApp.defaultPort);

const server = http.createServer((req, res) => {
  const url = new URL(
    req.url ?? suiteApp.routes.base,
    `http://${req.headers.host ?? "localhost"}`
  );

  if (req.method === "GET" && url.pathname === suiteApp.routes.health) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", app: suiteApp.id }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`${suiteApp.name} skeleton server`);
});

server.listen(port, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${port}${suiteApp.routes.base}`
  );
});
