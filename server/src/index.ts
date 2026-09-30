import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "unexpected server error";
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
