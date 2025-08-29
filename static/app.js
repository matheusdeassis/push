const statusEl = document.getElementById("status");
const btnEnable = document.getElementById("btn-enable");
const btnTest = document.getElementById("btn-test");

async function registerSW() {
  if (!("serviceWorker" in navigator)) throw new Error("Service Worker não suportado");

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  return reg;
}

async function getVapidKey() {
  const res = await fetch("/vapidPublicKey");
  const { key } = await res.json();

  return urlBase64ToUint8Array(key);
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);

  return outputArray;
}

async function enablePush() {
  try {
    statusEl.textContent = "solicitando permissão…";
    const permission = await Notification.requestPermission();

    if (permission !== "granted")
      throw new Error("Permissão negada");

    const reg = await registerSW();
    const appServerKey = await getVapidKey();

    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });

    const resp = await fetch("/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });

    if (!resp.ok)
      throw new Error("Falha ao registrar subscription");

    statusEl.textContent = "inscrito para push ✅";
  }
  
  catch (err) {
    console.error(err);
    statusEl.textContent = `erro: ${err.message}`;
  }
}

async function sendTest() {
  await fetch("/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json",
               "X-Auth-Token": "tijolo1" },
    body: JSON.stringify({
      title: "Teste",
      body: "Notificação de teste do PWA" })
  });
}

btnEnable.addEventListener("click", enablePush);
btnTest.addEventListener("click", sendTest);

statusEl.textContent = "pronto";