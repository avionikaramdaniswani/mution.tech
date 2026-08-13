// Debug: Check if cAdvisor sees Docker containers via /docker endpoint
// And check Docker API directly
const CADVISOR_URL = "http://168.110.215.158:9091";

async function debug() {
  // Try cAdvisor /docker endpoint
  console.log("=== Try cAdvisor /api/v1.3/docker endpoint ===");
  try {
    const res = await fetch(`${CADVISOR_URL}/api/v1.3/docker`);
    const data = await res.json();
    const keys = Object.keys(data);
    console.log(`Docker endpoint returned ${keys.length} containers:`);
    for (const key of keys) {
      const c = data[key];
      console.log(`  Key: ${key}`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Aliases: ${c.aliases?.join(", ") || "none"}`);
      console.log(`  Stats count: ${c.stats?.length || 0}`);
      if (c.stats && c.stats.length > 0) {
        const latest = c.stats[c.stats.length - 1];
        console.log(`  CPU total: ${latest.cpu?.usage?.total}`);
        console.log(`  Memory usage: ${latest.memory?.usage}`);
      }
      console.log("  ---");
    }
  } catch (e) {
    console.log("ERROR:", e.message);
  }

  // Try cAdvisor /containers/docker endpoint
  console.log("\n=== Try cAdvisor /api/v1.3/containers/docker endpoint ===");
  try {
    const res = await fetch(`${CADVISOR_URL}/api/v1.3/containers/docker`);
    const data = await res.json();
    console.log(`Name: ${data.name}`);
    console.log(`Aliases: ${data.aliases?.join(", ") || "none"}`);
    console.log(`Subcontainers: ${data.subcontainers?.length || 0}`);
    if (data.subcontainers) {
      for (const sc of data.subcontainers) {
        console.log(`  Subcontainer: ${sc.name}`);
      }
    }
    console.log(`Stats count: ${data.stats?.length || 0}`);
  } catch (e) {
    console.log("ERROR:", e.message);
  }

  // Try the machine endpoint to understand cgroup version
  console.log("\n=== Try cAdvisor /api/v1.3/machine endpoint ===");
  try {
    const res = await fetch(`${CADVISOR_URL}/api/v1.3/machine`);
    const data = await res.json();
    console.log(`Num cores: ${data.num_cores}`);
    console.log(`Memory capacity: ${data.memory_capacity}`);
    console.log(`Machine ID: ${data.machine_id}`);
    console.log(`System UUID: ${data.system_uuid}`);
    console.log(`Cloud provider: ${data.cloud_provider}`);
    console.log(`Instance type: ${data.instance_type}`);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}

debug().catch(console.error);
