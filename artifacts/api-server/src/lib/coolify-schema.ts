import { pool } from "@workspace/db";

let ensurePromise: Promise<void> | null = null;

export function ensureCoolifyTables(): Promise<void> {
  ensurePromise ??= (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coolify_resources (
        id serial PRIMARY KEY,
        project_id integer NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
        coolify_project_uuid text NOT NULL,
        coolify_environment_name text NOT NULL DEFAULT 'production',
        coolify_environment_uuid text,
        coolify_server_uuid text NOT NULL,
        coolify_application_uuid text,
        coolify_application_name text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS coolify_deployments (
        id serial PRIMARY KEY,
        deployment_id integer NOT NULL UNIQUE REFERENCES deployments(id) ON DELETE CASCADE,
        project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        coolify_deployment_uuid text NOT NULL,
        coolify_application_uuid text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS coolify_resources_project_id_idx
      ON coolify_resources(project_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS coolify_deployments_deployment_id_idx
      ON coolify_deployments(deployment_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS coolify_deployments_project_id_idx
      ON coolify_deployments(project_id)
    `);
  })();

  return ensurePromise;
}
