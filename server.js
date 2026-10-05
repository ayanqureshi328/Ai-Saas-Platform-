const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");

const port = Number(process.env.PORT || 3000);
const publicDirectory = path.join(__dirname, "public");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

let mongoClient;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > 16_384) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function savePrompt(request, response) {
  if (!process.env.MONGODB_URI) {
    sendJson(response, 503, { error: "Prompt saving is not configured. Add MONGODB_URI to the server environment." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readRequestBody(request));
  } catch (error) {
    const tooLarge = error.message === "Request body is too large.";
    sendJson(response, tooLarge ? 413 : 400, { error: tooLarge ? error.message : "Send a valid JSON request." });
    return;
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  if (!prompt || prompt.length > 3_000) {
    sendJson(response, 400, { error: "Prompt must contain between 1 and 3,000 characters." });
    return;
  }

  try {
    mongoClient ??= new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const database = mongoClient.db(process.env.MONGODB_DB || "aura");
    const result = await database.collection("prompts").insertOne({
      prompt,
      source: "live-demo",
      createdAt: new Date(),
    });
    sendJson(response, 201, { id: result.insertedId.toString(), saved: true });
  } catch (error) {
    console.error("MongoDB prompt save failed:", error.message);
    sendJson(response, 500, { error: "Unable to save your prompt right now." });
  }
}

async function serveStatic(request, response) {
  const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  const filePath = path.resolve(publicDirectory, `.${relativePath}`);
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const contents = await fs.promises.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(contents);
  } catch {
    response.writeHead(404).end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/prompts") {
    await savePrompt(request, response);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    await serveStatic(request, response);
    return;
  }

  response.writeHead(405, { Allow: "GET, HEAD, POST" }).end("Method not allowed");
});

server.listen(port, () => {
  console.log(`AURA is running at http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await mongoClient?.close();
  server.close(() => process.exit(0));
});