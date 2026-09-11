const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "Node.js backend is running"
  });
});

app.get("/api/products/analyze", async (req, res) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/analyze");

    const data = await response.json();

    res.json({
      source: "Node.js",
      aiAnalysis: data
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not connect to FastAPI"
    });
  }
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Node.js server running on http://localhost:${PORT}`);
});