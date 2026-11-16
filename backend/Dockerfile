FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download || true

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/mailops-server ./cmd/server/main.go

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata zstd
WORKDIR /app

COPY --from=builder /app/bin/mailops-server /app/bin/mailops-server
RUN mkdir -p /app/data

EXPOSE 8080
CMD ["/app/bin/mailops-server"]
