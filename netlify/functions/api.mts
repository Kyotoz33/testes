import type { Context, Config } from "@netlify/functions";
import { getStore, getDeployStore } from "@netlify/blobs";
import { handle } from "../lib/api-core.mts";

// Em produção os dados ficam num armazenamento global; em deploys de teste, isolados do deploy.
function store(name: string) {
  const prod = Netlify.context?.deploy?.context === "production";
  return prod
    ? getStore({ name, consistency: "strong" })
    : getDeployStore({ name, consistency: "strong" } as any);
}

export default async (req: Request, context: Context) =>
  handle(req, { store, env: (k) => Netlify.env.get(k), ip: context.ip });

export const config: Config = { path: "/api/*" };
