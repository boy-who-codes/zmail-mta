--[[
  MAILOPS Enterprise Custom Mailserver Policy for KumoMTA
  Dual-Engine: High-Performance Outbound MTA + Inbound MX Mailbox Receiver
]]

local kumo = require 'kumo'
local shaping = require 'policy-extras.shaping'
local sources = require 'policy-extras.sources'
local rollup = require 'policy-extras.rollup'

-- Multi-IP Egress Pools Configuration (Phase 1)
sources:setup { '/opt/kumomta/etc/policy/sources.toml' }

-- Traffic Shaping configuration
local shaper = shaping:setup_with_automation {
  publish = { 'http://kumo-tsa:8008' },
  subscribe = { 'http://kumo-tsa:8008' },
  extra_files = { '/opt/kumomta/etc/policy/shaping.toml' },
}

kumo.on('init', function()
  -- 1. Public MX Inbound + Relay ESMTP Listener
  kumo.start_esmtp_listener {
    listen = '0.0.0.0:2525',
    relay_hosts = { '0.0.0.0/0' },
  }

  -- 2. HTTP Management & Injection API
  kumo.start_http_listener {
    listen = '0.0.0.0:8000',
    trusted_hosts = { '0.0.0.0/0' },
  }

  -- 3. Spool Storage (RocksDB)
  kumo.define_spool {
    kind = 'RocksDB',
    name = 'data',
    path = '/var/spool/kumomta/data',
  }

  kumo.define_spool {
    kind = 'RocksDB',
    name = 'meta',
    path = '/var/spool/kumomta/meta',
  }

  -- 4. Event Logging
  kumo.configure_local_logs {
    log_dir = '/var/log/kumomta',
    max_segment_duration = '5s',
  }

  shaper.setup_publish()
end)

-- Helper: Check if an egress pool exists in sources.toml
local function pool_exists(pool_name)
  if not pool_name or pool_name == '' or pool_name == 'default' then
    return true
  end
  local f = io.open('/opt/kumomta/etc/policy/sources.toml', 'r')
  if f then
    local content = f:read('*a')
    f:close()
    local ok, parsed = pcall(kumo.serde.toml_parse, content)
    if ok and parsed and parsed.pool and parsed.pool[pool_name] then
      return true
    end
  end
  return false
end

-- Helper: Check if recipient is in the Suppression List (Phase 3 Circuit Breaker)
local function is_suppressed(recipient)
  if not recipient or recipient == '' then
    return false
  end
  local clean = string.lower(recipient):gsub('^<', ''):gsub('>$', '')
  local f = io.open('/opt/kumomta/etc/policy/suppressions.json', 'r')
  if f then
    local content = f:read('*a')
    f:close()
    local ok, list = pcall(kumo.serde.json_parse, content)
    if ok and type(list) == 'table' then
      for _, item in ipairs(list) do
        local sup = string.lower(item)
        if sup == clean then
          return true
        end
        if string.sub(sup, 1, 1) == '@' and string.find(clean, sup, 1, true) then
          return true
        end
      end
    end
  end
  return false
end

-- Queue Configuration Hook (Phase 1: Dynamic Pool Egress Binding)
kumo.on('get_queue_config', function(domain, tenant, campaign, routing_domain)
  local egress_pool = 'default'
  if tenant and tenant ~= '' and pool_exists(tenant) then
    egress_pool = tenant
  end

  return kumo.make_queue_config {
    -- Auto retry transient delayed emails
    retry_interval = '60s',
    max_retry_interval = '20m',
    egress_pool = egress_pool,
  }
end)

-- Message Reception Hook (Custom Mailserver Inbound & Outbound Logic)
kumo.on('smtp_server_message_received', function(msg)
  local recipient = tostring(msg:recipient())
  local sender = tostring(msg:sender())
  local id = msg:id()

  -- Phase 3 Pre-send Circuit Breaker: Reject suppressed recipients immediately
  if is_suppressed(recipient) then
    kumo.reject(550, '5.1.1 [MAILOPS SUPPRESSION] Recipient ' .. recipient .. ' is permanently suppressed (RFC 3463 hard bounce / spam complaint). Message rejected.')
  end

  -- Extract X-Pool or X-Tenant routing header (Phase 1)
  local pool_header = msg:get_first_named_header_value('X-Pool')
  if not pool_header or pool_header == '' then
    pool_header = msg:get_first_named_header_value('X-Tenant')
  end
  if pool_header and pool_header ~= '' and pool_exists(pool_header) then
    msg:set_meta('tenant', pool_header)
  else
    msg:set_meta('tenant', 'default')
  end

  -- MX Rollup for Big 4 Mailbox Providers (Phase 2)
  pcall(function()
    rollup.reroute_based_on_mx_host_suffix(msg, {
      ['.google.com.'] = 'gmail.com',
      ['.googlemail.com.'] = 'gmail.com',
      ['.yahoodns.net.'] = 'yahoo.com',
      ['.olc.protection.outlook.com.'] = 'outlook.com',
      ['.mail.protection.outlook.com.'] = 'outlook.com',
      ['.icloud.com.'] = 'icloud.com',
    })
  end)

  local subject = msg:get_first_named_header_value('Subject') or 'Operational Delivery Message'
  local content_type = msg:get_first_named_header_value('Content-Type') or 'text/plain'
  local raw_data = ''
  pcall(function()
    raw_data = msg:get_data() or ''
  end)

  -- Forward reception record to MAILOPS Control Plane for live inbox capture & ARF processing
  pcall(function()
    kumo.http.build_client({}):post({
      url = 'http://mailops-backend:8080/api/v1/inbound',
      headers = { ['Content-Type'] = 'application/json' },
      body = kumo.json_encode({
        id = id,
        sender = sender,
        recipient = recipient,
        subject = subject,
        pool = pool_header or 'default',
        body_text = raw_data,
        raw_mime = raw_data,
        raw_headers = {
          ['content-type'] = content_type,
          ['subject'] = subject,
          ['from'] = sender,
          ['to'] = recipient,
        },
        received_at = os.time(),
      }),
    })
  end)
end)
