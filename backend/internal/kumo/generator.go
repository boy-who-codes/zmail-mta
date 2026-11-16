package kumo

import (
	"fmt"
	"strings"

	"mailops.io/backend/internal/models"
)

// GenerateLuaPolicy produces a deterministic Lua policy for KumoMTA
func GenerateLuaPolicy(pools []models.IPPool, ips []models.SendingIP, domains []models.Domain) string {
	var sb strings.Builder

	sb.WriteString("-- KumoMTA Delivery Policy Configuration\n")
	sb.WriteString("-- Generated automatically by MAILOPS Control Plane\n\n")

	sb.WriteString("local kumo = require 'kumo'\n\n")

	sb.WriteString("kumo.on('init', function()\n")
	sb.WriteString("  -- ESMTP Listener on port 25 & submission 587\n")
	sb.WriteString("  kumo.start_esmtp_listener {\n")
	sb.WriteString("    listen = '0.0.0.0:25',\n")
	sb.WriteString("    relay_hosts = { '127.0.0.1', '10.0.0.0/8' },\n")
	sb.WriteString("  }\n\n")

	sb.WriteString("  -- Define Egress Paths based on IP Pools\n")
	for _, pool := range pools {
		for _, ipStr := range pool.IPs {
			pathName := fmt.Sprintf("%s-%s", pool.ID, strings.ReplaceAll(ipStr, ".", "-"))
			sb.WriteString(fmt.Sprintf("  kumo.define_egress_path {\n"))
			sb.WriteString(fmt.Sprintf("    name = '%s',\n", pathName))
			sb.WriteString(fmt.Sprintf("    source_address = '%s',\n", ipStr))
			sb.WriteString(fmt.Sprintf("    max_connection_rate = '50/s',\n"))
			sb.WriteString(fmt.Sprintf("    concurrency = 30,\n"))
			sb.WriteString(fmt.Sprintf("  }\n"))
		}
	}
	sb.WriteString("end)\n\n")

	sb.WriteString("-- Route outgoing domain messages to appropriate pool\n")
	sb.WriteString("kumo.on('get_egress_path', function(domain, source)\n")
	sb.WriteString("  -- Default fallback egress pool\n")
	sb.WriteString("  return 'dedicated-trans-us1-198-51-100-14'\n")
	sb.WriteString("end)\n")

	return sb.String()
}
