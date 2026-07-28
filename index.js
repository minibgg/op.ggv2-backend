import express from "express";
import cors from "cors";
import { loadPlayer } from "./src/utils.js";

const app = express();
app.use(cors());

app.get("/api/profile/:playerData", async (req, res) => {
  try {
    const data = await loadPlayer(req.params.playerData);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не удалось загрузить профиль" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
