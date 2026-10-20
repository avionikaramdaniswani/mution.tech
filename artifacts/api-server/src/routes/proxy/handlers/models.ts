import type { Request, Response } from "express";
import { authenticate } from "../services/auth";
import { getConfiguredPublicModelCatalog } from "../services/providers";

export function providerOwner(provider: string): string {
  return provider.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function listModels(req: Request, res: Response): Promise<void> {
  const row = await authenticate(req, res);
  if (!row) return;

  const catalog = await getConfiguredPublicModelCatalog();

  const allowed = row.key.allowedModels && row.key.allowedModels.length > 0
    ? new Set(row.key.allowedModels)
    : null;

  const models = catalog
    .filter((model) => !allowed || allowed.has(model.id))
    .map((model) => {
      return {
        id: model.id,
        object: "model",
        created: 0,
        owned_by: providerOwner(model.provider),
        mution: {
          label: model.label,
          provider: model.provider,
          pricing: model.pricing,
          basePricing: model.basePricing,
          context: model.context,
          note: model.note ?? null,
          description: model.description,
          aliases: model.aliases ?? [],
        },
      };
    });

  res.json({
    object: "list",
    data: models,
  });
}
