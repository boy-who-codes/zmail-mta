package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mailops.io/backend/internal/api"
	"mailops.io/backend/internal/ingest"
	"mailops.io/backend/internal/redisclient"
	"mailops.io/backend/internal/store"
	"mailops.io/backend/internal/webhook"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dataFile := os.Getenv("DATA_FILE")
	if dataFile == "" {
		dataFile = "data/mailops-state.json"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	appStore := store.NewStore(dataFile)
	redisCli := redisclient.NewClient(redisURL)

	workerPool := ingest.NewWorkerPool(redisCli, appStore)
	workerPool.Start()

	// Launch Autonomous Mailbox & IP Warmup Scheduler Daemon (evaluates daily ramp curves)
	appStore.StartAutonomousWarmupWorker(context.Background(), 24*time.Hour)

	// Launch Autonomous AI Conversational Warmup Peer Network Worker (exchanges simulated peer threads)
	store.StartAIWarmupBackgroundWorker(context.Background(), appStore, 30*time.Minute)

	// Launch Autonomous Drip Sequence Cadence Worker (evaluates follow-up delays and stops on reply)
	store.StartAutonomousSequenceWorker(context.Background(), appStore, 15*time.Minute)

	webhookStreamer := webhook.NewStreamer(appStore)

	server := api.NewServer(appStore, workerPool, webhookStreamer)

	httpServer := &http.Server{
		Addr:         ":" + port,
		Handler:      server,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	fmt.Println("=======================================================")
	fmt.Println("  MAILOPS Enterprise Control Plane Backend")
	fmt.Println("  (Authoritative Observed State Engine - No Mock Data)")
	fmt.Println("=======================================================")
	fmt.Printf("✓ HTTP REST API listening on http://0.0.0.0:%s\n", port)
	fmt.Printf("✓ Redis Stream Bus connected to: %s\n", redisURL)
	fmt.Printf("✓ Distributed Ingestion Worker Pool active (8 workers)\n")
	fmt.Printf("✓ Event Webhook Streamer (HMAC-SHA256) active\n")
	fmt.Printf("✓ Storage file: %s\n", dataFile)
	fmt.Println("=======================================================")

	// Background server loop
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to listen: %v", err)
		}
	}()

	// Graceful shutdown on SIGINT/SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println("\nShutting down MAILOPS backend gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	workerPool.Stop()
	redisCli.Close()
	fmt.Println("MAILOPS backend stopped cleanly.")
}
