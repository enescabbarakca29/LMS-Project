const path = require("path");
const fs = require("fs");
const dns = require("dns");
const { app, BrowserWindow, Tray, Menu } = require("electron");

let mainWindow = null;
let tray = null;

function resolveAssetPath(...parts) {
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  return path.join(base, ...parts);
}

function getOfflineUrl() {
  return `file://${resolveAssetPath("static", "offline.html")}`;
}

function hasInternet() {
  return new Promise((resolve) => {
    dns.lookup("cloudflare.com", (err) => resolve(!err));
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0b0b0b",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // PWA/service worker karışmasın diye kapalı kalsın
      serviceWorkers: false,
    },
  });

  const url = "http://127.0.0.1:3000";
  const offlineUrl = getOfflineUrl();

  // ✅ Kamera/Mikrofon izni: sadece bizim origin için izin ver
  const allowedOrigins = ["http://127.0.0.1:3000", "http://localhost:3000"];

  const ses = mainWindow.webContents.session;
  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    try {
      const reqUrl = details?.requestingUrl || "";
      const okOrigin = allowedOrigins.some((o) => reqUrl.startsWith(o));

      // media = kamera/mikrofon
      if (permission === "media" && okOrigin) return callback(true);

      // İstersen ileride eklenir
      // if (permission === "notifications" && okOrigin) return callback(true);

      return callback(false);
    } catch {
      return callback(false);
    }
  });

  // Bazı Electron sürümlerinde bu da gerekebiliyor:
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const okOrigin = allowedOrigins.some((o) => requestingOrigin?.startsWith(o));
    if (permission === "media" && okOrigin) return true;
    return false;
  });

  // === DOWNLOAD MANAGER ===
  const downloadDir = path.join(app.getPath("userData"), "downloads");
  fs.mkdirSync(downloadDir, { recursive: true });

  mainWindow.webContents.session.on("will-download", (event, item) => {
    const fileName = item.getFilename();
    const downloadPath = path.join(downloadDir, fileName);
    item.setSavePath(downloadPath);

    item.on("updated", () => {
      const received = item.getReceivedBytes();
      const total = item.getTotalBytes();
      if (total > 0 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(received / total);
      }
    });

    item.once("done", () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setProgressBar(-1);
    });
  });

  // === OFFLINE/ONLINE ===
  let showingOffline = false;

  async function syncState() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const internetOk = await hasInternet().catch(() => false);

    if (!internetOk && !showingOffline) {
      showingOffline = true;
      mainWindow.loadURL(offlineUrl);
      return;
    }

    if (internetOk && showingOffline) {
      showingOffline = false;
      mainWindow.loadURL(url);
    }
  }

  mainWindow.loadURL(url);

  mainWindow.webContents.on("did-fail-load", () => {
    showingOffline = true;
    mainWindow.loadURL(offlineUrl);
  });

  const timer = setInterval(syncState, 5000);
  syncState();

  // X'e basınca tray'e at
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    clearInterval(timer);
    mainWindow = null;
  });

  // === TRAY ===
  if (!tray) {
    tray = new Tray(path.join(__dirname, "assets", "icon.png"));

    const trayMenu = Menu.buildFromTemplate([
      {
        label: "LMS Aç",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: "separator" },
      {
        label: "Çıkış",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip("LMS Desktop");
    tray.setContextMenu(trayMenu);

    tray.on("click", () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) mainWindow.hide();
      else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  // tray'de kalsın
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
  else {
    mainWindow.show();
    mainWindow.focus();
  }
});
