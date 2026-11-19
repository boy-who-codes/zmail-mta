package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"mailops.io/backend/internal/models"
	"mailops.io/backend/internal/store"
)

func TestMasterAdminAndTenantAuth(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "mailops-auth-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	st := store.NewStore(tmpDir)
	server := NewServer(st, nil, nil)

	// Set test environment variables dynamically
	t.Setenv("MASTER_ADMIN_USER", "testadmin.me")
	t.Setenv("MASTER_ADMIN_PASSWORD", "testAdminPass!2026")

	// 1. Test Master Admin login with wrong password
	badReqBody, _ := json.Marshal(models.AuthLoginRequest{
		Username: "testadmin.me",
		Password: "wrongpassword",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(badReqBody))
	rec := httptest.NewRecorder()
	server.handleAuthLogin(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 on bad password, got %d", rec.Code)
	}

	// 2. Test Master Admin login with correct dynamic credentials
	goodReqBody, _ := json.Marshal(models.AuthLoginRequest{
		Username: "testadmin.me",
		Password: "testAdminPass!2026",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(goodReqBody))
	rec = httptest.NewRecorder()
	server.handleAuthLogin(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on master login, got %d: %s", rec.Code, rec.Body.String())
	}

	var masterResp models.AuthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &masterResp); err != nil {
		t.Fatalf("failed to parse master auth response: %v", err)
	}
	if masterResp.Role != "master_admin" || !masterResp.CanManageTenants || masterResp.Token == "" {
		t.Fatalf("unexpected master response: %+v", masterResp)
	}

	// 3. Test creating a tenant without master token -> should be 403 Forbidden
	tenantCreateBody, _ := json.Marshal(models.Subaccount{
		Name:     "Acme Deliverability",
		Email:    "client@acme.com",
		Password: "acmeSecretPassword123!",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/subaccounts", bytes.NewReader(tenantCreateBody))
	rec = httptest.NewRecorder()
	server.handleAddSubaccount(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when creating tenant without master auth, got %d", rec.Code)
	}

	// 4. Test creating a tenant with master token -> should succeed
	req = httptest.NewRequest(http.MethodPost, "/api/v1/subaccounts", bytes.NewReader(tenantCreateBody))
	req.Header.Set("Authorization", "Bearer "+masterResp.Token)
	rec = httptest.NewRecorder()
	server.handleAddSubaccount(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 when creating tenant with master auth, got %d: %s", rec.Code, rec.Body.String())
	}

	var createdTenant models.Subaccount
	if err := json.Unmarshal(rec.Body.Bytes(), &createdTenant); err != nil {
		t.Fatalf("failed to parse created tenant: %v", err)
	}
	if createdTenant.Password != "" || createdTenant.PasswordHash != "" {
		t.Fatalf("passwords should be sanitized in response! Got pass=%q hash=%q", createdTenant.Password, createdTenant.PasswordHash)
	}

	// 5. Test logging in as the newly created tenant
	tenantLoginBody, _ := json.Marshal(models.AuthLoginRequest{
		Username: "client@acme.com",
		Password: "acmeSecretPassword123!",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(tenantLoginBody))
	rec = httptest.NewRecorder()
	server.handleAuthLogin(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on tenant login, got %d: %s", rec.Code, rec.Body.String())
	}

	var tenantResp models.AuthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &tenantResp); err != nil {
		t.Fatalf("failed to parse tenant auth response: %v", err)
	}
	if tenantResp.Role != "tenant" || tenantResp.CanManageTenants {
		t.Fatalf("tenant should have role 'tenant' and CanManageTenants=false: %+v", tenantResp)
	}

	// 6. Test tenant trying to create another tenant -> should be 403 Forbidden!
	rogueTenantBody, _ := json.Marshal(models.Subaccount{
		Name:     "Rogue Subaccount",
		Email:    "rogue@client.com",
		Password: "pass",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/subaccounts", bytes.NewReader(rogueTenantBody))
	req.Header.Set("Authorization", "Bearer "+tenantResp.Token)
	rec = httptest.NewRecorder()
	server.handleAddSubaccount(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 when tenant tries to create another tenant, got %d", rec.Code)
	}
}
