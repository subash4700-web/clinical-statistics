// In dev mode, node_modules/electron shadows the built-in and returns a path string.
// Patch _resolveFilename to return the bare module name so Node/Electron loads the built-in.
const Module = require("module");
function _requireElectron() {
  const orig = Module._resolveFilename;
  Module._resolveFilename = (req, ...args) => req === "electron" ? req : orig(req, ...args);
  try { return Module._load("electron", module, false); }
  finally { Module._resolveFilename = orig; }
}
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = _requireElectron();
const fs     = require("fs");
const path   = require("path");
const https  = require("https");
const os     = require("os");
const crypto = require("crypto");

// ─── LICENSE CONFIGURATION ────────────────────────────────────────────────────
const KEYGEN_ACCOUNT_ID      = "426a7e2d-e63c-4638-be4e-8a5df6910c1d";
const POLICY_INSTITUTION_ID  = "496afd51-6a1c-4716-bcc6-5df055da2497";
const POLICY_USER_ID         = "d3967743-0000-0000-0000-000000000000"; // user annual policy

// How long to trust a cached valid result before re-checking online (ms)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// How long to allow offline grace period when server is unreachable (ms)
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── LICENSE CACHE ────────────────────────────────────────────────────────────
function getLicenseCachePath() {
  return path.join(app.getPath("userData"), "license.json");
}

function readLicenseCache() {
  try {
    return JSON.parse(fs.readFileSync(getLicenseCachePath(), "utf8"));
  } catch (e) {
    return null;
  }
}

function writeLicenseCache(data) {
  try {
    fs.writeFileSync(getLicenseCachePath(), JSON.stringify(data, null, 2));
  } catch (e) {}
}

// ─── KEYGEN.SH VALIDATION ────────────────────────────────────────────────────
function validateKeyOnline(licenseKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ meta: { key: licenseKey } });
    const options = {
      hostname: "api.keygen.sh",
      path: `/v1/accounts/${KEYGEN_ACCOUNT_ID}/licenses/actions/validate-key`,
      method: "POST",
      headers: {
        "Content-Type":   "application/vnd.api+json",
        "Accept":         "application/vnd.api+json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Invalid server response")); }
      });
    });

    req.on("error",   reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.write(body);
    req.end();
  });
}

// ─── MACHINE ACTIVATION ───────────────────────────────────────────────────────
function activateMachine(licenseKey, licenseId) {
  const fingerprint = crypto.createHash("sha256")
    .update(`${os.hostname()}-${os.platform()}-${os.arch()}`)
    .digest("hex").substring(0, 40);

  const body = JSON.stringify({
    data: {
      type: "machines",
      attributes: { fingerprint, name: os.hostname(), platform: os.platform() },
      relationships: { license: { data: { type: "licenses", id: licenseId } } }
    }
  });

  const options = {
    hostname: "api.keygen.sh",
    path: `/v1/accounts/${KEYGEN_ACCOUNT_ID}/machines`,
    method: "POST",
    headers: {
      "Content-Type":   "application/vnd.api+json",
      "Accept":         "application/vnd.api+json",
      "Authorization":  `License ${licenseKey}`,
      "Content-Length": Buffer.byteLength(body),
    },
    timeout: 10000,
  };

  // Fire-and-forget — never blocks or breaks the activation flow
  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => console.log("Machine activation response:", res.statusCode, data));
  });
  req.on("error", (e) => console.log("Machine activation error:", e.message));
  req.on("timeout", () => { req.destroy(); });
  req.write(body);
  req.end();
}

// ─── LICENSE CHECK FLOW ───────────────────────────────────────────────────────
async function checkLicense() {
  const cache = readLicenseCache();
  const now   = Date.now();

  // 1. Fresh cache — skip network call
  if (cache && cache.key && cache.status === "valid" && cache.lastChecked) {
    const age    = now - cache.lastChecked;
    const expiry = cache.expiry ? new Date(cache.expiry).getTime() : Infinity;
    if (age < CACHE_TTL_MS && expiry > now) {
      return { valid: true, fromCache: true };
    }
  }

  // 2. Try online validation with stored key
  if (cache && cache.key) {
    try {
      const result = await validateKeyOnline(cache.key);
      const valid  = result.meta?.valid === true;
      const expiry = result.data?.attributes?.expiry || null;
      const code   = result.meta?.code   || "";

      if (valid) {
        const policyId = result.data?.relationships?.policy?.data?.id || "";
        const planType = policyId.startsWith("496afd51") ? "institution" : "user";
        const domain   = result.data?.attributes?.metadata?.domain || cache.domain || null;
        writeLicenseCache({ key: cache.key, status: "valid", lastChecked: now, expiry, planType, domain });
        return { valid: true };
      }

      writeLicenseCache({ key: cache.key, status: "invalid", lastChecked: now, code });
      return { valid: false, code };
    } catch (e) {
      // Network error — grant grace period if key was previously valid and not expired
      if (
        cache.status === "valid" &&
        cache.expiry &&
        new Date(cache.expiry).getTime() > now
      ) {
        const age = now - (cache.lastChecked || 0);
        if (age < GRACE_PERIOD_MS) {
          return { valid: true, offline: true };
        }
      }
    }
  }

  // 3. No valid key on record
  return { valid: false, noKey: true };
}

// ─── WINDOWS ──────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload-app.js"),
    },
  });

  win.loadFile("app.html");
  // win.webContents.openDevTools(); // Remove before publishing
  return win;
}

function createLicenseWindow() {
  const win = new BrowserWindow({
    width: 520,
    height: 440,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload-license.js"),
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile("license.html");
  return win;
}

// ─── IPC HANDLERS ─────────────────────────────────────────────────────────────
ipcMain.handle("license:validate", async (event, key) => {
  const trimmed = (key || "").trim();
  if (!trimmed) return { valid: false, detail: "Please enter a license key." };

  try {
    const result = await validateKeyOnline(trimmed);
    const valid  = result.meta?.valid === true;
    const expiry = result.data?.attributes?.expiry || null;
    const code   = result.meta?.code   || "";
    const detail = result.meta?.detail || "";

    if (valid) {
      const policyId  = result.data?.relationships?.policy?.data?.id || "";
      const planType  = policyId.startsWith("496afd51") ? "institution" : "user";
      const domain    = result.data?.attributes?.metadata?.domain || null;
      const licenseId = result.data?.id || "";
      writeLicenseCache({ key: trimmed, status: "valid", lastChecked: Date.now(), expiry, planType, domain });

      // Register machine with Keygen so the dashboard shows activation
      if (licenseId) activateMachine(trimmed, licenseId);

      // Open main app and close license window
      createWindow();
      const licWin = BrowserWindow.fromWebContents(event.sender);
      if (licWin) setTimeout(() => licWin.close(), 500); // brief delay so success msg is visible
      return { valid: true, expiry };
    }

    // Friendly messages per Keygen error code
    const messages = {
      EXPIRED:          "This license key has expired. Please renew your subscription.",
      SUSPENDED:        "This license has been suspended. Please contact support.",
      NOT_FOUND:        "License key not found. Please check and try again.",
      TOO_MANY_MACHINES: "This license is already activated on too many devices.",
    };

    return { valid: false, detail: messages[code] || detail || "Invalid license key." };
  } catch (e) {
    return {
      valid: false,
      detail: "Unable to reach the license server. Please check your internet connection.",
    };
  }
});

ipcMain.handle("license:getStoredKey", (_event) => {
  return readLicenseCache()?.key || "";
});

ipcMain.handle("license:openExternal", (_event, url) => {
  shell.openExternal(url);
});

const API_BASE = "https://clinical-stats-api.vercel.app";

ipcMain.handle("license:sendCode", async (_event, email) => {
  try {
    const res  = await fetch(`${API_BASE}/api/send-code`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return { sent: false, error: data.error || "Failed to send code." };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: "Unable to reach verification server." };
  }
});

ipcMain.handle("license:verifyCode", async (event, email, code) => {
  try {
    const res  = await fetch(`${API_BASE}/api/verify-code`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) return { verified: false, error: data.error || "Verification failed." };

    // Store JWT as institution cache entry
    writeLicenseCache({
      key:         data.token,
      status:      "valid",
      lastChecked: Date.now(),
      expiry:      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      planType:    "institution",
      domain:      data.domain,
    });

    // Open main app and close license window
    createWindow();
    const licWin = BrowserWindow.fromWebContents(event.sender);
    if (licWin) setTimeout(() => licWin.close(), 500);
    return { verified: true };
  } catch (e) {
    return { verified: false, error: "Unable to reach verification server." };
  }
});

ipcMain.handle("license:getInfo", () => {
  const cache = readLicenseCache();
  if (!cache || !cache.key) return null;
  // Mask middle segments: BD33FF-9F9CE8-1601C1-9FA867-E6ACF4-V3 → BD33FF-••••••-••••••-••••••-••••••-V3
  const parts  = cache.key.split("-");
  const masked = parts.map((p, i) => (i === 0 || i === parts.length - 1) ? p : "••••••").join("-");
  return {
    masked,
    status:   cache.status   || "unknown",
    expiry:   cache.expiry   || null,
    planType: cache.planType || "user",
    domain:   cache.domain   || null,
  };
});

ipcMain.handle("license:deactivate", async () => {
  try { fs.unlinkSync(getLicenseCachePath()); } catch (e) {}
  BrowserWindow.getAllWindows().forEach(w => w.close());
  createLicenseWindow();
  return { success: true };
});

// ─── MENU ─────────────────────────────────────────────────────────────────────
function createMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    }] : []),

    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => createWindow(),
        },
        { type: "separator" },
        {
          label: "Load Report...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (!focusedWindow) return;

            const result = await dialog.showOpenDialog(focusedWindow, {
              title: "Load Issue Report",
              filters: [
                { name: "JSON Reports", extensions: ["json"] },
                { name: "All Files",    extensions: ["*"]    },
              ],
              properties: ["openFile"],
            });

            if (!result.canceled && result.filePaths.length > 0) {
              try {
                const fileContent = fs.readFileSync(result.filePaths[0], "utf8");
                const reportData  = JSON.parse(fileContent);
                focusedWindow.webContents.executeJavaScript(`
                  if (typeof loadReportData === 'function') {
                    loadReportData(${JSON.stringify(reportData)});
                  } else {
                    alert('Report loading function not available. Please ensure the app is fully loaded.');
                  }
                `);
              } catch (error) {
                dialog.showErrorBox("Error Loading Report", `Failed to load report file:\n${error.message}`);
              }
            }
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },

    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac ? [
          { role: "pasteAndMatchStyle" },
          { role: "delete" },
          { role: "selectAll" },
          { type: "separator" },
          { label: "Speech", submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }] },
        ] : [
          { role: "delete" },
          { type: "separator" },
          { role: "selectAll" },
        ]),
      ],
    },

    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },

    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac ? [
          { type: "separator" },
          { role: "front" },
          { type: "separator" },
          { role: "window" },
        ] : [
          { role: "close" },
        ]),
      ],
    },
  ];

  template.push({
    label: "Help",
    submenu: [
      {
        label: "License Info…",
        click: () => {
          const win = BrowserWindow.getFocusedWindow();
          if (win) win.webContents.send("show-license-modal");
        },
      },
      { type: "separator" },
      {
        label: "Deactivate License",
        click: async () => {
          const focused = BrowserWindow.getFocusedWindow();
          const { response } = await dialog.showMessageBox(focused, {
            type: "warning",
            buttons: ["Deactivate", "Cancel"],
            defaultId: 1,
            cancelId: 1,
            title: "Deactivate License",
            message: "Deactivate this license?",
            detail: "The app will close and you will need to enter your license key again on next launch.",
          });
          if (response === 0) {
            try { fs.unlinkSync(getLicenseCachePath()); } catch (e) {}
            BrowserWindow.getAllWindows().forEach(w => w.close());
            createLicenseWindow();
          }
        },
      },
    ],
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── APP LIFECYCLE ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createMenu();

  const licenseResult = await checkLicense();
  if (licenseResult.valid) {
    createWindow();
  } else {
    createLicenseWindow();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      checkLicense().then((result) => {
        if (result.valid) createWindow();
        else createLicenseWindow();
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
