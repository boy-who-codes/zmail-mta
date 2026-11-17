# Connecting Microsoft Outlook & Mail Clients to MailOps

This guide provides step-by-step instructions for connecting **Microsoft Outlook (Desktop & Mobile)**, **Apple Mail**, and **Mozilla Thunderbird** directly to your self-hosted MailOps platform for sending and receiving email.

---

## Connection Parameters Summary

| Protocol | Purpose | Port | Encryption | Authentication |
|---|---|---|---|---|
| **SMTP** (Outbound) | Sending Email | **587** | **STARTTLS** | PLAIN / LOGIN |
| **SMTP** (Alternate) | Firewalled Networks | **2525** | **STARTTLS** | PLAIN / LOGIN |
| **SMTP** (Direct TLS) | SMTPS | **465** | **SSL/TLS** | PLAIN / LOGIN |
| **IMAP** (Inbound) | Reading / Receiving | **993** | **SSL/TLS** | PLAIN / LOGIN |
| **IMAP** (Alternate) | Local / Unencrypted | **143** | **STARTTLS** | PLAIN / LOGIN |

- **Server Hostname:** Your server public IP or FQDN (e.g. `mail.yourdomain.com`).
- **Username:** Your full mailbox address (e.g. `sarah@growth.yourdomain.com`).
- **Password:** The password assigned during mailbox creation or in the Dovecot users file.

---

## 1. Microsoft Outlook (Desktop / Windows / macOS)

### Step 1: Open Account Setup
1. In Outlook, navigate to **File > Info > Add Account**.
2. Enter your email address (e.g. `sarah@growth.yourdomain.com`).
3. Click **Advanced options** and check **Let me set up my account manually**.
4. Click **Connect**.

### Step 2: Choose Account Type
1. Select **IMAP** from the available account types.

### Step 3: Enter Server Settings
- **Incoming Mail (IMAP):**
  - **Server:** `mail.yourdomain.com` (or your server's public IP)
  - **Port:** `993`
  - **Encryption method:** `SSL/TLS`
  - **Require logon using SPA:** *Unchecked*
- **Outgoing Mail (SMTP):**
  - **Server:** `mail.yourdomain.com` (or your server's public IP)
  - **Port:** `587`
  - **Encryption method:** `STARTTLS`
  - **Require logon using SPA:** *Unchecked*

### Step 4: Authentication
1. When prompted for password, enter your mailbox password.
2. Under Outgoing Server settings, ensure **"My outgoing server (SMTP) requires authentication"** is checked, and **"Use same settings as my incoming mail server"** is selected.
3. Click **Done**. Outlook will perform a test send and receive.

---

## 2. Microsoft Outlook (iOS & Android)

1. Open the Outlook App on your device.
2. Go to **Settings > Add Email Account > Add an Email Account**.
3. Enter your full email address.
4. When prompted for provider, tap **Set Up Account Manually > IMAP**.
5. Fill in the parameters:
   - **Display Name:** Your Full Name (e.g., Sarah Jenkins)
   - **IMAP Incoming Mail Server:** `mail.yourdomain.com:993`
   - **IMAP Username:** `sarah@growth.yourdomain.com`
   - **IMAP Password:** Your Password
   - **SMTP Outgoing Mail Server:** `mail.yourdomain.com:587`
   - **SMTP Username:** `sarah@growth.yourdomain.com`
   - **SMTP Password:** Your Password
6. Tap **Sign In** / **Checkmark** to verify connection.

---

## 3. Apple Mail (macOS & iOS)

1. Open **System Settings > Internet Accounts** (or **Settings > Mail > Accounts** on iOS).
2. Click **Add Account > Other Mail Account**.
3. Enter Name, Email Address, and Password.
4. Select **IMAP** as Account Type.
5. Enter `mail.yourdomain.com` for both Incoming Mail Server and Outgoing Mail Server.
6. Click **Sign In**.

---

## 4. Testing Your Connection in MailOps UI

Before configuring external clients, you can verify your credentials and network connectivity directly from the MailOps dashboard:
1. Open the **Mailboxes & Pools** app in MailOps.
2. Click **Add Sender Mailbox** or edit an existing mailbox.
3. In the **SMTP Handshake & Credentials** card, enter host, port, username, and password.
4. Click **"⚡ Test SMTP Handshake"**.
5. The system will measure latency in milliseconds, verify TLS negotiation, and test SASL PLAIN authentication against the live MTA.
