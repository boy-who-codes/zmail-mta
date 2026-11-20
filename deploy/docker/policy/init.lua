--[[
  MAILOPS Enterprise Custom Mailserver Policy for KumoMTA
  Dual-Engine: High-Performance Outbound MTA + Inbound MX Mailbox Receiver
]]

local kumo = require 'kumo'
local shaping = require 'policy-extras.shaping'
local sources = require 'policy-extras.sources'
local rollup = require 'policy-extras.rollup'

-- Helper to safely read file content
local function read_file_content(path)
  local f = io.open(path, 'r')
  if f then
    local content = f:read('*a')
    f:close()
    return content
  end
  return nil
end

-- Helper: Authenticate SMTP User against MailOps Control Plane
local function authenticate_smtp_user(user, pass)
  if not user or user == '' or not pass or pass == '' then
    return false
  end

  local ok, res = pcall(function()
    local client = kumo.http.build_client({})
    local req = client:post('http://mailops-backend:8080/api/v1/smtp/auth')
    req:header('Content-Type', 'application/json')
    req:body(kumo.json_encode({ username = user, password = pass }))
    return req:send()
  end)

  if ok and res and res:status_code() == 200 then
    local parse_ok, data = pcall(kumo.serde.json_parse, res:text())
    if parse_ok and data and data.authenticated then
      return true
    end
  end
  return false
end

-- SMTP Authentication Hooks for Microsoft Outlook, Thunderbird, and standard mail clients
kumo.on('smtp_server_auth_plain', function(authz, authc, password)
  return authenticate_smtp_user(authc, password)
end)

-- Multi-IP Egress Pools Configuration (Phase 1)
sources:setup { '/opt/kumomta/etc/policy/sources.toml' }

-- Phase 4: Native Wire-Speed Cryptographic DKIM Signing (RFC 6376)
local dkim_signer_cache = {}
local function get_dkim_signer_for_domain(domain)
  if not domain or domain == '' then
    return nil
  end

  local entry = dkim_signer_cache[domain]
  if entry and (os.time() - entry.ts) < 600 then
    return entry.signer
  end

  local ok, res = pcall(function()
    local client = kumo.http.build_client({})
    local req = client:get('http://mailops-backend:8080/api/v1/dkim/key?domain=' .. domain)
    return req:send()
  end)

  if ok and res and res:status_code() == 200 then
    local parse_ok, dkim_info = pcall(kumo.serde.json_parse, res:text())
    if parse_ok and dkim_info and dkim_info.private_key_pem and dkim_info.selector then
      local signer_ok, signer = pcall(function()
        return kumo.dkim.rsa_sha256_signer {
          domain = domain,
          selector = dkim_info.selector,
          headers = { 'From', 'To', 'Subject', 'Date', 'Message-ID', 'MIME-Version', 'Content-Type' },
          key = {
            key_data = dkim_info.private_key_pem,
          },
        }
      end)
      if signer_ok and signer then
        dkim_signer_cache[domain] = { signer = signer, ts = os.time() }
        return signer
      end
    end
  end
  return nil
end

-- Helper: Check if domain is registered locally in MailOps
local local_domains_cache = {}
local function is_domain_local(domain)
  if not domain or domain == '' then
    return false
  end
  local clean = string.lower(domain):gsub('^<', ''):gsub('>$', '')
  if clean == 'zmail.local' or clean == 'mailops.local' then
    return true
  end

  local entry = local_domains_cache[clean]
  if entry and (os.time() - entry.ts) < 60 then
    return entry.is_local
  end

  local ok, res = pcall(function()
    local client = kumo.http.build_client({})
    local req = client:get('http://mailops-backend:8080/api/v1/domains/check-local?domain=' .. clean)
    return req:send()
  end)

  if ok and res and res:status_code() == 200 then
    local parse_ok, data = pcall(kumo.serde.json_parse, res:text())
    if parse_ok and data and data.is_local then
      local_domains_cache[clean] = { is_local = true, ts = os.time() }
      return true
    end
  end
  local_domains_cache[clean] = { is_local = false, ts = os.time() }
  return false
end

-- Traffic Shaping configuration
local shaper = shaping:setup_with_automation {
  publish = { 'http://kumo-tsa:8008' },
  subscribe = { 'http://kumo-tsa:8008' },
  extra_files = { '/opt/kumomta/etc/policy/shaping.toml' },
}

kumo.on('get_egress_path_config', shaper.get_egress_path_config)

kumo.on('init', function()
  -- 1. Public MX Inbound + Relay ESMTP Listener with STARTTLS & SMTP AUTH support
  local tls_cert = read_file_content('/opt/kumomta/etc/policy/tls.crt')
  local tls_key = read_file_content('/opt/kumomta/etc/policy/tls.key')

  local listener_opts = {
    listen = '0.0.0.0:2525',
    relay_hosts = { '0.0.0.0/0' },
  }

  if tls_cert and tls_key and #tls_cert > 0 and #tls_key > 0 then
    listener_opts.tls_certificate = { key_data = tls_cert }
    listener_opts.tls_private_key = { key_data = tls_key }
  end

  kumo.start_esmtp_listener(listener_opts)

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

-- Queue Configuration Hook (Phase 1: Dynamic Pool Egress Binding + Dovecot Maildir)
kumo.on('get_queue_config', function(domain, tenant, campaign, routing_domain)
  if campaign == 'maildir' or tenant == 'maildir' or domain == 'maildir' then
    return kumo.make_queue_config {
      protocol = {
        maildir_path = '/var/mail/{{local_part}}@{{domain_part}}/Maildir',
      },
    }
  end

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

  -- Standalone Two-Way Mailbox Routing: Deliver local recipient messages to Maildir for Dovecot IMAP
  local rec_lower = string.lower(recipient):gsub('^<', ''):gsub('>$', '')
  local rec_domain = ''
  local at_pos = string.find(rec_lower, '@')
  if at_pos then
    rec_domain = string.sub(rec_lower, at_pos + 1)
  end

  local is_local = false
  if rec_domain == 'zmail.local' or rec_domain == 'mailops.local' then
    is_local = true
  elseif rec_domain ~= '' and is_domain_local(rec_domain) then
    is_local = true
  end

  if is_local or msg:get_first_named_header_value('X-Local-Delivery') then
    msg:set_meta('campaign', 'maildir')
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

  -- Phase 4: Native RFC 6376 DKIM Cryptographic Signing
  pcall(function()
    local from_hdr = msg:from_header()
    local sender_domain = nil
    if from_hdr and from_hdr.domain then
      sender_domain = from_hdr.domain
    else
      local _, at_sym = string.find(sender, '@')
      if at_sym then
        sender_domain = string.sub(sender, at_sym + 1):gsub('>$', '')
      end
    end

    if sender_domain and sender_domain ~= '' then
      local signer = get_dkim_signer_for_domain(sender_domain)
      if signer then
        msg:dkim_sign(signer)
      end
    end
  end)

  local subject = msg:get_first_named_header_value('Subject') or 'Operational Delivery Message'
  local content_type = msg:get_first_named_header_value('Content-Type') or 'text/plain'
  local raw_data = ''
  pcall(function()
    raw_data = msg:get_data() or ''
  end)

  -- Forward reception record to MAILOPS Control Plane for live inbox capture & ARF processing
  pcall(function()
    local client = kumo.http.build_client({})
    local req = client:post('http://mailops-backend:8080/api/v1/inbound')
    req:header('Content-Type', 'application/json')
    req:body(kumo.json_encode({
      id = id,
      sender = sender,
      recipient = recipient,
      subject = subject,
      pool = pool_header or 'default',
      body_text = raw_data,
      body_html = raw_data,
      raw_mime = raw_data,
      raw_headers = {
        ['content-type'] = content_type,
        ['subject'] = subject,
        ['from'] = sender,
        ['to'] = recipient,
      },
      received_at = os.time(),
    }))
    req:send()
  end)
end)
