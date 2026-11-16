package dns

import (
	"context"
	"fmt"
	"net"
	"strings"
)

type VerificationResult struct {
	SPFValid    bool   `json:"spf_valid"`
	SPFRecord   string `json:"spf_record"`
	DKIMValid   bool   `json:"dkim_valid"`
	DKIMRecord  string `json:"dkim_record"`
	DMARCValid  bool   `json:"dmarc_valid"`
	DMARCRecord string `json:"dmarc_record"`
	PTRValid    bool   `json:"ptr_valid"`
	PTRRecord   string `json:"ptr_record"`
}

// CheckDomain performs live DNS queries for SPF, DKIM, DMARC, and PTR
func CheckDomain(ctx context.Context, domainName, selector, expectedIP string) (*VerificationResult, error) {
	resolver := &net.Resolver{
		PreferGo: true,
	}

	result := &VerificationResult{}

	// 1. Check SPF (TXT records on root domain)
	txts, err := resolver.LookupTXT(ctx, domainName)
	if err == nil {
		for _, txt := range txts {
			if strings.HasPrefix(txt, "v=spf1") {
				result.SPFRecord = txt
				result.SPFValid = true
				break
			}
		}
	}
	if !result.SPFValid {
		result.SPFRecord = "No SPF record found in DNS"
	}

	// 2. Check DKIM (TXT on selector._domainkey.domain)
	if selector != "" {
		dkimHost := fmt.Sprintf("%s._domainkey.%s", selector, domainName)
		dkimTxts, err := resolver.LookupTXT(ctx, dkimHost)
		if err == nil {
			for _, txt := range dkimTxts {
				if strings.Contains(txt, "v=DKIM1") {
					result.DKIMRecord = txt
					result.DKIMValid = true
					break
				}
			}
		}
	}
	if !result.DKIMValid {
		result.DKIMRecord = "No DKIM signature record found for selector"
	}

	// 3. Check DMARC (TXT on _dmarc.domain)
	dmarcHost := fmt.Sprintf("_dmarc.%s", domainName)
	dmarcTxts, err := resolver.LookupTXT(ctx, dmarcHost)
	if err == nil {
		for _, txt := range dmarcTxts {
			if strings.HasPrefix(txt, "v=DMARC1") {
				result.DMARCRecord = txt
				result.DMARCValid = true
				break
			}
		}
	}
	if !result.DMARCValid {
		result.DMARCRecord = "No DMARC policy found in DNS"
	}

	// 4. Check PTR (Reverse DNS lookup of expected IP)
	if expectedIP != "" {
		names, err := resolver.LookupAddr(ctx, expectedIP)
		if err == nil && len(names) > 0 {
			result.PTRRecord = strings.TrimSuffix(names[0], ".")
			if strings.Contains(result.PTRRecord, domainName) {
				result.PTRValid = true
			}
		}
	}
	if !result.PTRValid {
		if result.PTRRecord == "" {
			result.PTRRecord = "No reverse DNS (PTR) record configured for IP"
		}
	}

	return result, nil
}
