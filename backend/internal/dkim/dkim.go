package dkim

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
)

// KeyPair holds generated private and public DKIM materials
type KeyPair struct {
	Selector      string `json:"selector"`
	Domain        string `json:"domain"`
	PrivateKeyPEM string `json:"private_key_pem"`
	PublicKeyTXT  string `json:"public_key_txt"`
	DNSHost       string `json:"dns_host"`
}

// GenerateRSAKeyPair creates a standard 2048-bit RSA key for DKIM signing
func GenerateRSAKeyPair(selector, domain string) (*KeyPair, error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, fmt.Errorf("failed to generate RSA key: %w", err)
	}

	// Encode private key to PKCS#1 PEM
	privDER := x509.MarshalPKCS1PrivateKey(privateKey)
	privBlock := &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privDER,
	}
	privPEM := string(pem.EncodeToMemory(privBlock))

	// Encode public key to PKIX DER, then base64 for DNS TXT record
	pubDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal public key: %w", err)
	}
	pubBase64 := base64.StdEncoding.EncodeToString(pubDER)

	// Format standard DKIM DNS TXT record
	txtRecord := fmt.Sprintf("v=DKIM1; k=rsa; p=%s", pubBase64)
	dnsHost := fmt.Sprintf("%s._domainkey.%s", selector, domain)

	return &KeyPair{
		Selector:      selector,
		Domain:        domain,
		PrivateKeyPEM: privPEM,
		PublicKeyTXT:  txtRecord,
		DNSHost:       dnsHost,
	}, nil
}
