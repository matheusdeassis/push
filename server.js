import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const SUBS_FILE = path.join(__dirname, "subscriptions.json");

async function readSubs() {
  try {
    const data = await fs.readFile(SUBS_FILE, "utf-8");
    return JSON.parse(data);
  }
  
  catch {
    return [];
  }
}

async function writeSubs(subs) {
  await fs.writeFile(SUBS_FILE, JSON.stringify(subs, null, 2));
}

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, AUTH_TOKEN } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("Faltam VAPID keys no .env. Gere com: npx web-push generate-vapid-keys");
  process.exit(1);
}

webpush.setVapidDetails("mailto:seu-email@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Servir o PWA
app.use("/", express.static(path.join(__dirname, "static")));

// Expor a public key para o front
app.get("/vapidPublicKey", (req, res) => res.json({ key: VAPID_PUBLIC_KEY }));

// Receber subscription do navegador
app.post("/subscribe", async (req, res) => {
  const sub = req.body;

  if (!sub || !sub.endpoint)
    return res.status(400).json({ error: "Invalid subscription" });

  const subs = await readSubs();

  if (!subs.find((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    await writeSubs(subs);
  }

  res.status(201).json({ ok: true });
});

// Endpoint para seu Python disparar notificação
app.post("/notify", async (req, res) => {
  if (AUTH_TOKEN && req.headers["x-auth-token"] !== AUTH_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title = "BD atualizada", body = "Houve alteração no banco de dados.", url } = req.body || {};
  const payload = JSON.stringify({ title, body, url });

  const subs = await readSubs();
  const alive = [];
  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        alive.push(sub);

        return { endpoint: sub.endpoint, ok: true };
      }
    
      catch (err) {
        return { endpoint: sub.endpoint, ok: false, statusCode: err.statusCode };
      }
    })
  );

  await writeSubs(alive);
  res.json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));