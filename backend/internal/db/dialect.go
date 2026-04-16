package db

import (
	"fmt"
)

// Dialect defines the interface for different database behaviors
type Dialect interface {
	GetName() string
	GetPlaceholder(i int) string // Handle $1 (Postgres) vs ? (MySQL/Oracle)
	WrapIdentifier(id string) string // Handle "id" vs `id`
}

type PostgresDialect struct{}
func (d *PostgresDialect) GetName() string { return "postgres" }
func (d *PostgresDialect) GetPlaceholder(i int) string { return fmt.Sprintf("$%d", i) }
func (d *PostgresDialect) WrapIdentifier(id string) string { return fmt.Sprintf("\"%s\"", id) }

type OracleDialect struct{}
func (d *OracleDialect) GetName() string { return "oracle" }
func (d *OracleDialect) GetPlaceholder(i int) string { return fmt.Sprintf(":%d", i) }
func (d *OracleDialect) WrapIdentifier(id string) string { return id } // Oracle usually uses uppercase

// QueryBuilder is a simple helper to demonstrate multi-dialect support
type QueryBuilder struct {
	dialect Dialect
}

func NewQueryBuilder(dialect Dialect) *QueryBuilder {
	return &QueryBuilder{dialect: dialect}
}

func (q *QueryBuilder) SelectAll(table string) string {
	return fmt.Sprintf("SELECT * FROM %s", q.dialect.WrapIdentifier(table))
}
