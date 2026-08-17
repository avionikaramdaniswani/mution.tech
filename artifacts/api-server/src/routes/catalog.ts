/**
 * Public catalog endpoint — kembalikan MODEL_CATALOG dengan harga efektif
 * (setelah override admin diterapkan). Tidak butuh autentikasi.
 */
import { Router } from "express";
import { getConfiguredPublicModelCatalog } from "./v1-proxy";

const router = Router();

router.get("/catalog", async (_req, res) => {
  try {
    res.json(await getConfiguredPublicModelCatalog());
  } catch (error) {
    console.error("Failed to load public model catalog:", error);
    res.status(500).json({ error: "Gagal mengambil katalog model" });
  }
});

export default router;
