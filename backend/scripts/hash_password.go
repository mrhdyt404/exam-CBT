package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt err: %v", err)
	}

	fmt.Printf("Generated Go bcrypt hash: %s\n", string(hash))

	// Verify locally
	if err := bcrypt.CompareHashAndPassword(hash, []byte("password123")); err != nil {
		log.Fatalf("local compare failed: %v", err)
	}
	fmt.Println("Local bcrypt verification: SUCCESS!")

	// Connect to postgres and update users
	conn, err := pgx.Connect(context.Background(), "postgres://cbt_user:cbt_pass@127.0.0.1:5432/cbt_db?sslmode=disable")
	if err != nil {
		log.Fatalf("connect err: %v", err)
	}
	defer conn.Close(context.Background())

	tag, err := conn.Exec(context.Background(), "UPDATE users SET password_hash = $1", string(hash))
	if err != nil {
		log.Fatalf("update err: %v", err)
	}

	fmt.Printf("Updated users table: %v\n", tag)
}
