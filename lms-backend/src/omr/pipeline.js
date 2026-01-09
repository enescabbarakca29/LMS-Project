// src/omr/pipeline.js
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

/**
 * stdout içinde başka yazılar karışırsa bile,
 * en sondaki JSON objesini yakalayıp parse etmeye çalışır.
 */
function parseLastJsonObject(text) {
  const s = String(text || "").trim();
  if (!s) throw new Error("empty_python_output");

  // En sondan başlayarak son '{' bulup parse dene
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === "{") {
      const cand = s.slice(i);
      try {
        return JSON.parse(cand);
      } catch (_) {}
    }
  }

  // Son çare: direkt parse
  return JSON.parse(s);
}

function spawnPython(args, opts = {}) {
  // Windows uyumu: python yoksa py -3 dene
  const tryList = [
    { cmd: "python", args },
    { cmd: "py", args: ["-3", ...args] },
  ];

  return new Promise((resolve, reject) => {
    let idx = 0;

    const trySpawn = () => {
      const item = tryList[idx++];
      const p = spawn(item.cmd, item.args, opts);

      p.once("error", (e) => {
        if (idx < tryList.length) return trySpawn();
        reject(e);
      });

      resolve(p);
    };

    trySpawn();
  });
}

async function runPythonOMR(imageBuffer) {
  const tmpDir = os.tmpdir();
  const imgPath = path.join(tmpDir, `omr_${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`);
  fs.writeFileSync(imgPath, imageBuffer);

  const pyPath = path.join(__dirname, "engine", "omr_engine.py");

  // -u: unbuffered stdout (JSON çıktısı hemen gelsin)
  const py = await spawnPython(["-u", pyPath], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });

  let out = "";
  let err = "";

  py.stdout.on("data", (d) => (out += d.toString()));
  py.stderr.on("data", (d) => (err += d.toString()));

  return new Promise((resolve, reject) => {
    py.on("close", (code) => {
      try { fs.unlinkSync(imgPath); } catch {}

      if (code !== 0) {
        return reject(new Error(err || `python_exit_${code}`));
      }

      try {
        const json = parseLastJsonObject(out);
        resolve(json);
      } catch (e) {
        reject(new Error("python_output_parse_error: " + (out || err)));
      }
    });

    // Python stdin: {"image_path": "..."}
    py.stdin.write(JSON.stringify({ image_path: imgPath }));
    py.stdin.end();
  });
}

async function runPipeline(fileBuffer, fileInfo) {
  const engine = await runPythonOMR(fileBuffer);

  // engine hata döndüyse bile JSON dön
  if (engine?.error) {
    return {
      page: 1,
      studentId: null,
      answers: {},
      uncertainAnswers: [],
      confidence: 0,
      warnings: [engine.error],
      processing: engine,
      meta: {
        filename: fileInfo?.originalname ?? "capture.jpg",
        size: fileInfo?.size ?? 0,
        mimetype: fileInfo?.mimetype ?? "image/jpeg",
        receivedAt: new Date().toISOString(),
      },
    };
  }

  return {
    page: 1,
    studentId: null,
    answers: engine.answers ?? {},
    uncertainAnswers: engine.uncertainAnswers ?? [],
    confidence: engine.confidence ?? 0,
    warnings: engine.warnings ?? [],
    processing: engine,
    meta: {
      filename: fileInfo?.originalname ?? "capture.jpg",
      size: fileInfo?.size ?? 0,
      mimetype: fileInfo?.mimetype ?? "image/jpeg",
      receivedAt: new Date().toISOString(),
    },
  };
}

/**
 * ✅ routes.js'deki /scan-batch için gerekli
 * files: multer array -> [{ buffer, originalname, size, mimetype }, ...]
 */
async function runPipelineBatch(files = []) {
  const pages = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const result = await runPipeline(f.buffer, f);
    pages.push({ ...result, page: i + 1 });
  }
  return pages;
}

module.exports = { runPipeline, runPipelineBatch };
