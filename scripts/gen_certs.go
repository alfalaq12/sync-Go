package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"log"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"
)

func main() {
	certDir := "certs"
	if err := os.MkdirAll(certDir, 0755); err != nil {
		log.Fatalf("failed to create certs dir: %v", err)
	}

	// 1. Generate CA
	ca := &x509.Certificate{
		SerialNumber: big.NewInt(2026),
		Subject: pkix.Name{
			Organization: []string{"Sync-Go DSP CA"},
			CommonName:   "Sync-Go Root CA",
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().AddDate(10, 0, 0),
		IsCA:                  true,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth, x509.ExtKeyUsageServerAuth},
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		BasicConstraintsValid: true,
	}

	caPrivKey, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		log.Fatalf("failed to generate CA key: %v", err)
	}

	caBytes, err := x509.CreateCertificate(rand.Reader, ca, ca, &caPrivKey.PublicKey, caPrivKey)
	if err != nil {
		log.Fatalf("failed to create CA cert: %v", err)
	}

	savePEM(filepath.Join(certDir, "ca.crt"), "CERTIFICATE", caBytes)
	savePEM(filepath.Join(certDir, "ca.key"), "RSA PRIVATE KEY", x509.MarshalPKCS1PrivateKey(caPrivKey))

	// 2. Generate Server Cert
	serverCert := &x509.Certificate{
		SerialNumber: big.NewInt(2027),
		Subject: pkix.Name{
			Organization: []string{"Sync-Go DSP Server"},
			CommonName:   "localhost",
		},
		IPAddresses:  []net.IP{net.IPv4(127, 0, 0, 1), net.IPv6loopback},
		DNSNames:     []string{"localhost"},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().AddDate(10, 0, 0),
		SubjectKeyId: []byte{1, 2, 3, 4, 6},
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth, x509.ExtKeyUsageServerAuth},
		KeyUsage:     x509.KeyUsageDigitalSignature,
	}

	serverPrivKey, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		log.Fatalf("failed to generate server key: %v", err)
	}

	serverBytes, err := x509.CreateCertificate(rand.Reader, serverCert, ca, &serverPrivKey.PublicKey, caPrivKey)
	if err != nil {
		log.Fatalf("failed to create server cert: %v", err)
	}

	savePEM(filepath.Join(certDir, "server.crt"), "CERTIFICATE", serverBytes)
	savePEM(filepath.Join(certDir, "server.key"), "RSA PRIVATE KEY", x509.MarshalPKCS1PrivateKey(serverPrivKey))

	// 3. Generate Client Cert (for Agent)
	clientCert := &x509.Certificate{
		SerialNumber: big.NewInt(2028),
		Subject: pkix.Name{
			Organization: []string{"Sync-Go DSP Agent"},
			CommonName:   "sync-go-agent",
		},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().AddDate(10, 0, 0),
		SubjectKeyId: []byte{1, 2, 3, 4, 7},
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth, x509.ExtKeyUsageServerAuth},
		KeyUsage:     x509.KeyUsageDigitalSignature,
	}

	clientPrivKey, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		log.Fatalf("failed to generate client key: %v", err)
	}

	clientBytes, err := x509.CreateCertificate(rand.Reader, clientCert, ca, &clientPrivKey.PublicKey, caPrivKey)
	if err != nil {
		log.Fatalf("failed to create client cert: %v", err)
	}

	savePEM(filepath.Join(certDir, "client.crt"), "CERTIFICATE", clientBytes)
	savePEM(filepath.Join(certDir, "client.key"), "RSA PRIVATE KEY", x509.MarshalPKCS1PrivateKey(clientPrivKey))

	log.Println("Successfully generated CA, Server, and Client certificates in ./certs directory.")
}

func savePEM(filename, pemType string, b []byte) {
	f, err := os.Create(filename)
	if err != nil {
		log.Fatalf("failed to create file %s: %v", filename, err)
	}
	defer f.Close()

	pem.Encode(f, &pem.Block{Type: pemType, Bytes: b})
}
