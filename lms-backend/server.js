const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

// OMR router
const omrRoutes = require("./src/omr/routes");
app.use("/api/omr", omrRoutes);

const PORT = process.env.PORT || 3005;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});

