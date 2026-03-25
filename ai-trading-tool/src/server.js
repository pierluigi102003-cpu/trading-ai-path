const express = require("express");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const path = require("path");
const analyzeRoute = require("./routes/analyze");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "trading-path-ai-v3.html"));
});

app.use("/api/analyze", analyzeRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});