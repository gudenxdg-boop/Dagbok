const STORAGE_KEY = "koddagbok.v0.1";

const el = (id) => document.getElementById(id);

const todayDateEl = el("todayDate");
const moodEl = el("mood");
const moodValueEl = el("moodValue");
const moodPillEl = el("moodPill");
const thoughtEl = el("thought");
const statusEl = el("status");
const historyEl = el("history");
const exportBoxEl = el("exportBox");

const saveBtn = el("save");
const newThoughtBtn = el("newThought");
const exportBtn = el("export");
const importInput = el("import");
const clearTodayBtn = el("clearToday");

function pad(n) { return String(n).padStart(2, "0"); }

function isoDateLocal(d = new Date()) {
  // YYYY-MM-DD i lokal tid
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function prettyDate(d = new Date()) {
  // Svenska datumformat
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return d.toLocaleDateString("sv-SE", opts);
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { entries: {} };
  } catch {
    return { entries: {} };
  }
}

function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function moodLabel(v) {
  if (v >= 85) return "🔥 top";
  if (v >= 70) return "😄 bra";
  if (v >= 55) return "🙂 okej";
  if (v >= 40) return "😕 segt";
  if (v >= 25) return "🥶 tungt";
  return "🫠 botten";
}

function moodColor(v) {
  if (v >= 70) return "var(--good)";
  if (v >= 45) return "var(--warn)";
  return "var(--bad)";
}

const THOUGHTS = [
  "Jag vill göra något som blir kvar.",
  "Det räcker att jag öppnar detta ibland.",
  "Idag är en dag som bara händer en gång.",
  "Jag vill känna att jag rör mig framåt, även om det är små steg.",
  "Jag vill göra något som känns kul igen.",
  "Jag kan bygga vad som helst – jag behöver bara börja.",
  "Jag fastnar ibland, men jag ger mig inte.",
  "En liten grej är fortfarande en grej.",
  "Jag vill göra saker som känns som jag.",
  "Ibland är det bästa att bara skriva en rad och spara.",
];

function randomThought() {
  const i = Math.floor(Math.random() * THOUGHTS.length);
  return THOUGHTS[i];
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateMoodUI() {
  const v = Number(moodEl.value);
  moodValueEl.textContent = String(v);
  moodPillEl.textContent = `${moodLabel(v)} · ${v}`;
  moodPillEl.style.borderColor = "rgba(255,255,255,.10)";
  moodPillEl.style.boxShadow = `0 0 0 1px rgba(255,255,255,.06) inset`;
  moodPillEl.style.background = "rgba(255,255,255,.03)";
  moodPillEl.style.color = "var(--text)";
  moodPillEl.style.outline = `2px solid ${moodColor(v)}33`;
}

function renderHistory(db) {
  const entries = db.entries || {};
  const keys = Object.keys(entries).sort((a,b) => (a < b ? 1 : -1)); // senaste först

  historyEl.innerHTML = "";

  if (keys.length === 0) {
    historyEl.innerHTML = `<div class="muted">Inga sparade dagar ännu.</div>`;
    return;
  }

  const slice = keys.slice(0, 10);
  for (const k of slice) {
    const e = entries[k];
    const div = document.createElement("div");
    div.className = "histItem";

    const dateNice = new Date(k + "T12:00:00"); // undvik timezone-krångel
    const dateText = dateNice.toLocaleDateString("sv-SE", { year:"numeric", month:"short", day:"numeric" });

    div.innerHTML = `
      <div class="histTop">
        <div class="histDate">${dateText}</div>
        <div class="histMood">${moodLabel(e.mood)} · ${e.mood}</div>
      </div>
      <div class="histThought">${escapeHtml(e.thought || "")}</div>
    `;

    // klick -> ladda den dagen i editorn (read-only feel men du kan ändra och spara igen)
    div.addEventListener("click", () => {
      moodEl.value = String(e.mood ?? 50);
      thoughtEl.value = e.thought ?? "";
      updateMoodUI();
      setStatus(`Laddade ${dateText}. (Ändra och tryck “Spara idag” om du vill skriva över idag.)`);
    });

    historyEl.appendChild(div);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function loadToday(db) {
  const key = isoDateLocal();
  const entry = db.entries?.[key];
  if (entry) {
    moodEl.value = String(entry.mood ?? 50);
    thoughtEl.value = entry.thought ?? "";
    setStatus(`Laddade sparad dag (${key}).`);
  } else {
    moodEl.value = "50";
    thoughtEl.value = randomThought();
    setStatus("Ny dag. Skriv eller slumpa en tanke och spara.");
  }
  updateMoodUI();
}

function saveToday(db) {
  const key = isoDateLocal();
  const mood = Number(moodEl.value);
  const thought = (thoughtEl.value || "").trim();

  if (!db.entries) db.entries = {};
  db.entries[key] = {
    mood,
    thought: thought.length ? thought : randomThought(),
    savedAt: new Date().toISOString(),
    version: "0.1"
  };

  saveDb(db);
  renderHistory(db);
  setStatus(`Sparade ${key}.`);
}

function clearToday(db) {
  const key = isoDateLocal();
  if (db.entries && db.entries[key]) {
    delete db.entries[key];
    saveDb(db);
    renderHistory(db);
    thoughtEl.value = randomThought();
    moodEl.value = "50";
    updateMoodUI();
    setStatus(`Rensade ${key}.`);
  } else {
    setStatus("Inget att rensa idag.");
  }
}

function exportJson(db) {
  const json = JSON.stringify(db, null, 2);
  exportBoxEl.textContent = json;

  // För bekvämlighet: kopiera också till clipboard om möjligt
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(json).then(
      () => setStatus("Export klar (JSON visas nedan och kopierades till urklipp)."),
      () => setStatus("Export klar (JSON visas nedan).")
    );
  } else {
    setStatus("Export klar (JSON visas nedan).");
  }
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(String(reader.result || "{}"));
      if (!incoming || typeof incoming !== "object") throw new Error("Bad JSON");
      if (!incoming.entries || typeof incoming.entries !== "object") throw new Error("Missing entries");

      // Merge: incoming vinner om samma datum finns
      const db = loadDb();
      db.entries = { ...(db.entries || {}), ...(incoming.entries || {}) };

      saveDb(db);
      renderHistory(db);
      loadToday(db);
      setStatus("Import klar (merge).");
    } catch {
      setStatus("Import misslyckades. Filen verkar inte vara rätt JSON-format.");
    }
  };
  reader.readAsText(file);
}

// Init
(function init() {
  todayDateEl.textContent = prettyDate(new Date());

  const db = loadDb();
  loadToday(db);
  renderHistory(db);

  moodEl.addEventListener("input", () => {
    updateMoodUI();
    setStatus("Inte sparad ännu.");
  });

  newThoughtBtn.addEventListener("click", () => {
    thoughtEl.value = randomThought();
    setStatus("Ny tanke slumpad. (Spara om du vill.)");
  });

  saveBtn.addEventListener("click", () => {
    const dbNow = loadDb();
    saveToday(dbNow);
  });

  clearTodayBtn.addEventListener("click", () => {
    const dbNow = loadDb();
    clearToday(dbNow);
  });

  exportBtn.addEventListener("click", () => {
    const dbNow = loadDb();
    exportJson(dbNow);
  });

  importInput.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (file) importJsonFile(file);
    importInput.value = "";
  });
})();
