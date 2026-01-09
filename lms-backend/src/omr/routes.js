// src/omr/routes.js
const express = require("express");
const multer = require("multer");
const { runPipeline, runPipelineBatch } = require("./pipeline"); // <-- batch eklendi

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

let lastResult = null;

// Tek sayfa
router.post("/scan", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "image missing" });

    const result = await runPipeline(req.file.buffer, {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    lastResult = { ...result, status: "scanned" };
    return res.json(lastResult);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "scan failed" });
  }
});

// ✅ Çoklu sayfa (batch)
router.post("/scan-batch", upload.array("images", 20), async (req, res) => {
  try {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "images missing" });
    }

    const pages = await runPipelineBatch(files);

    const result = {
      pageCount: pages.length,
      pages,                    // <-- çoklu sayfa sonuçları
      confidence: avgConfidence(pages),
      warnings: mergeWarnings(pages),
      meta: {
        receivedAt: new Date().toISOString(),
        files: files.map((f) => ({
          filename: f.originalname,
          size: f.size,
          mimetype: f.mimetype,
        })),
      },
    };

    lastResult = { ...result, status: "scanned" };
    return res.json(lastResult);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "scan-batch failed" });
  }
});

router.get("/latest", (req, res) => {
  if (!lastResult) return res.status(404).json({ error: "no result yet" });
  return res.json(lastResult);
});

router.post("/submit", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "invalid body" });
    }

    lastResult = {
      ...body,
      status: "approved",
      approvedAt: new Date().toISOString(),
    };

    return res.json({ ok: true, saved: true, lastResult });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "submit failed" });
  }
});

function avgConfidence(pages) {
  const vals = pages.map((p) => Number(p.confidence || 0)).filter((x) => !Number.isNaN(x));
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function mergeWarnings(pages) {
  const all = [];
  for (const p of pages) {
    if (Array.isArray(p.warnings)) all.push(...p.warnings.map((w) => `P${p.page}: ${w}`));
  }
  return all;
}

module.exports = router;
