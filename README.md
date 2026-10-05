# AURA

A one-page AURA AI writing tool landing page with an interactive writing demo and a MongoDB-backed prompt-saving endpoint.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `MONGODB_URI` to a MongoDB connection string. `MONGODB_DB` is optional and defaults to `aura`.
4. Set those values in your shell environment, then run `npm start` and open `http://localhost:3000`.

The server does not load `.env` files automatically. In PowerShell, set the variables in the current session before `npm start`:

```powershell
$env:MONGODB_URI = "your-mongodb-connection-string"
$env:MONGODB_DB = "aura"
npm start
```

The demo displays an illustrative draft locally. Submitting a prompt also stores the original prompt in the MongoDB `prompts` collection. Without a MongoDB URI, the draft still appears, while the status message explains that saving is unavailable.