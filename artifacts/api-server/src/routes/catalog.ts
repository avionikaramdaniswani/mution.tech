/**
 * Public catalog endpoint — kembalikan MODEL_CATALOG dengan harga efektif
 * (setelah override admin diterapkan). Tidak butuh autentikasi.
 */
import { Router } from "express";
import { MODEL_CATALOG } from "@workspace/model-catalog";
import { adminGetModelPricingOverrides } from "./v1-proxy";

const router = Router();

router.get("/catalog", async (_req, res) => {
  try {
    const overrides = await adminGetModelPricingOverrides();
    const overrideMap = new Map(overrides.map((o) => [o.modelId, o]));

    const catalog = MODEL_CATALOG.map((m) => {
      const ov = overrideMap.get(m.id);
      let effectivePricing = { ...m.pricing };
      let pricingMode = "default";

      if (ov && ov.mode !== "default") {
        pricingMode = ov.mode;

        if (ov.mode === "free") {
          effectivePricing = { input: 0, output: 0 };
        } else if (ov.mode === "discount_percent" && ov.discountPercent != null) {
          const factor = 1 - Math.min(100, Math.max(0, ov.discountPercent)) / 100;
          effectivePricing = {
            input: m.pricing.input * factor,
            output: m.pricing.output * factor,
          };
        } else if (ov.mode === "fixed_price") {
          effectivePricing = {
            input: ov.inputPriceOverride != null ? parseFloat(ov.inputPriceOverride) : m.pricing.input,
            output: ov.outputPriceOverride != null ? parseFloat(ov.outputPriceOverride) : m.pricing.output,
          };
        }
      }

      return {
        id: m.id,
        label: m.label,
        provider: m.provider,
        pricing: effectivePricing,
        basePricing: m.pricing,
        pricingMode,
        context: m.context,
        note: m.note ?? null,
        description: m.description,
        aliases: m.aliases ?? [],
      };
    });

    res.json(catalog);
  } catch {
    // Fallback ke katalog statis jika DB belum siap
    res.json(
      MODEL_CATALOG.map((m) => ({
        ...m,
        basePricing: m.pricing,
        pricingMode: "default",
      })),
    );
  }
});

export default router;
