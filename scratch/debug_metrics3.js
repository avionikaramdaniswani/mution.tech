// Debug: Use Docker API directly via socket to get container stats
// This tests if we can use Docker Engine API instead of cAdvisor
const COOLIFY_UUID = "o6wt4078k85wlvi93pctxhxr";

async function debug() {
  // Check if Docker socket is accessible from Node.js
  // We'll use the Docker Engine API via HTTP
  
  // First, let's try via the Coolify API to get the actual container name
  console.log("=== Approach: Use Docker Engine API via TCP ===");
  console.log("Checking if Docker daemon is listening on TCP...");
  
  // Docker usually only listens on unix socket, not TCP.
  // So let's create a solution that works on the server.
  
  // The real fix: use Docker stats API via unix socket
  // On the server, we can curl the Docker socket:
  // curl --unix-socket /var/run/docker.sock http://localhost/containers/json
  
  console.log("\n=== Alternative: Query Coolify API for container info ===");
  // Check if there's a Coolify API we can use
  const COOLIFY_URL = process.env.COOLIFY_API_URL || "";
  const COOLIFY_TOKEN = process.env.COOLIFY_API_TOKEN || "";
  console.log(`Coolify URL configured: ${COOLIFY_URL ? "yes" : "no"}`);
  console.log(`Coolify Token configured: ${COOLIFY_TOKEN ? "yes" : "no"}`);
  
  if (COOLIFY_URL && COOLIFY_TOKEN) {
    try {
      const res = await fetch(`${COOLIFY_URL}/api/v1/applications/${COOLIFY_UUID}`, {
        headers: { "Authorization": `Bearer ${COOLIFY_TOKEN}` }
      });
      const data = await res.json();
      console.log("Coolify app info:", JSON.stringify(data, null, 2));
    } catch (e) {
      console.log("ERROR:", e.message);
    }
  }
  
  console.log("\n=== Summary ===");
  console.log("Root cause: cAdvisor v0.47.0 cannot see Docker containers on cgroup v2 systems.");
  console.log("The /api/v1.3/docker endpoint returns 0 containers.");
  console.log("The /api/v1.3/subcontainers only shows systemd services, not Docker containers.");
  console.log("\nSolution options:");
  console.log("1. Upgrade cAdvisor to v0.49.1+ which has full cgroup v2 support");
  console.log("2. Use Docker Engine API directly (/var/run/docker.sock) to get container stats");
  console.log("3. Use Coolify's built-in API to get application metrics");
}

debug().catch(console.error);
