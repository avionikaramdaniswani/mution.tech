// Debug script to trace the exact metrics flow
const CADVISOR_URL = "http://168.110.215.158:9091";

async function debug() {
  // Step 1: Fetch all containers from cAdvisor
  console.log("=== Step 1: Fetching containers from cAdvisor ===");
  const res = await fetch(`${CADVISOR_URL}/api/v1.3/subcontainers`);
  if (!res.ok) {
    console.log("ERROR: cAdvisor returned", res.status);
    return;
  }
  
  const containers = await res.json();
  console.log(`Found ${containers.length} containers total\n`);
  
  // Step 2: List all container names and aliases
  console.log("=== Step 2: All container names and aliases ===");
  for (const c of containers) {
    const aliases = c.aliases ? c.aliases.join(", ") : "(no aliases)";
    const hasStats = c.stats ? c.stats.length : 0;
    console.log(`  Name: ${c.name}`);
    console.log(`  Aliases: ${aliases}`);
    console.log(`  Stats count: ${hasStats}`);
    if (hasStats > 0) {
      const latest = c.stats[c.stats.length - 1];
      console.log(`  CPU total: ${latest.cpu?.usage?.total}`);
      console.log(`  Memory usage: ${latest.memory?.usage}`);
    }
    console.log("  ---");
  }
  
  // Step 3: Try to find "o6wt4078k85wlvi93pctxhxr" (the Coolify UUID from deploy logs)
  const uuid = "o6wt4078k85wlvi93pctxhxr";
  console.log(`\n=== Step 3: Searching for UUID "${uuid}" ===`);
  
  const found = containers.find((c) => 
    (c.name && c.name.includes(uuid)) || 
    (c.aliases && c.aliases.some((alias) => alias.includes(uuid)))
  );
  
  if (found) {
    console.log("FOUND! Container details:");
    console.log(JSON.stringify({
      name: found.name,
      aliases: found.aliases,
      namespace: found.namespace,
      statsCount: found.stats?.length,
      spec: found.spec ? { has_cpu: !!found.spec.cpu, has_memory: !!found.spec.memory, memory_limit: found.spec.memory?.limit } : null
    }, null, 2));
    
    if (found.stats && found.stats.length > 0) {
      const latest = found.stats[found.stats.length - 1];
      const first = found.stats[0];
      console.log("\nLatest stat:", JSON.stringify({
        timestamp: latest.timestamp,
        cpu_total: latest.cpu?.usage?.total,
        memory_usage: latest.memory?.usage,
        memory_working_set: latest.memory?.working_set
      }, null, 2));
      console.log("First stat:", JSON.stringify({
        timestamp: first.timestamp,
        cpu_total: first.cpu?.usage?.total,
      }, null, 2));
      
      // Calculate CPU like the backend does
      if (found.stats.length > 1) {
        const timeDelta = new Date(latest.timestamp).getTime() - new Date(first.timestamp).getTime();
        const cpuDelta = latest.cpu.usage.total - first.cpu.usage.total;
        console.log(`\nTime delta: ${timeDelta}ms`);
        console.log(`CPU delta: ${cpuDelta}`);
        const cpuPercent = (cpuDelta / (timeDelta * 1000000)) * 100;
        console.log(`CPU percent: ${cpuPercent}%`);
        console.log(`Rounded: ${Math.min(Math.round(cpuPercent), 100)}%`);
      }
    }
  } else {
    console.log("NOT FOUND! The UUID does not match any container name or alias.");
    console.log("\nContainers that look like Docker containers (contain 'docker'):");
    const dockerContainers = containers.filter(c => c.name && c.name.includes("docker"));
    for (const dc of dockerContainers) {
      console.log(`  ${dc.name} -> aliases: ${dc.aliases?.join(", ") || "none"}`);
    }
  }
}

debug().catch(console.error);
