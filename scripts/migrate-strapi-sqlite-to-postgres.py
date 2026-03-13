#!/usr/bin/env python3
import argparse
import sqlite3
import subprocess
from pathlib import Path


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def quote_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (bytes, bytearray)):
        return "'\\\\x" + value.hex() + "'::bytea"
    text = str(value).replace("'", "''")
    return f"'{text}'"


def sql_value(value, pg_type: str) -> str:
    if value is None:
        return "NULL"
    if pg_type == "BOOLEAN":
        if isinstance(value, (int, float)):
            return "TRUE" if int(value) != 0 else "FALSE"
        text = str(value).strip().lower()
        if text in {"1", "true", "t", "yes", "y"}:
            return "TRUE"
        if text in {"0", "false", "f", "no", "n"}:
            return "FALSE"
        return "NULL"
    if pg_type == "TIMESTAMPTZ":
        if isinstance(value, (int, float)):
            return f"TO_TIMESTAMP({value})"
        text = str(value).replace("'", "''")
        return f"'{text}'::timestamptz"
    return quote_literal(value)


def map_type(sqlite_type: str) -> str:
    t = (sqlite_type or "").upper()
    if "INT" in t:
        return "BIGINT"
    if any(x in t for x in ["CHAR", "CLOB", "TEXT", "JSON"]):
        return "TEXT"
    if "BLOB" in t:
        return "BYTEA"
    if any(x in t for x in ["REAL", "FLOA", "DOUB"]):
        return "DOUBLE PRECISION"
    if any(x in t for x in ["NUMERIC", "DECIMAL"]):
        return "NUMERIC"
    if "BOOL" in t:
        return "BOOLEAN"
    if any(x in t for x in ["DATE", "TIME"]):
        return "TIMESTAMPTZ"
    return "TEXT"


def build_sql(sqlite_path: Path, sql_out: Path) -> tuple[list[str], dict[str, int]]:
    conn = sqlite3.connect(str(sqlite_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    )
    tables = [r["name"] for r in cur.fetchall()]

    row_counts: dict[str, int] = {}
    lines: list[str] = []
    lines.append("BEGIN;")
    lines.append("SET client_min_messages TO WARNING;")

    for table in tables:
        cols = conn.execute(f"PRAGMA table_info({quote_ident(table)})").fetchall()
        col_names = [c["name"] for c in cols]
        col_types = {c["name"]: map_type(c["type"]) for c in cols}
        pk_cols = [c["name"] for c in sorted(cols, key=lambda x: x["pk"]) if c["pk"] > 0]

        lines.append(f"DROP TABLE IF EXISTS {quote_ident(table)} CASCADE;")

        col_defs = []
        for c in cols:
            name = quote_ident(c["name"])
            pg_type = col_types[c["name"]]
            not_null = " NOT NULL" if c["notnull"] else ""
            col_defs.append(f"{name} {pg_type}{not_null}")
        if pk_cols:
            pk_sql = ", ".join(quote_ident(n) for n in pk_cols)
            col_defs.append(f"PRIMARY KEY ({pk_sql})")

        lines.append(f"CREATE TABLE {quote_ident(table)} (\n  " + ",\n  ".join(col_defs) + "\n);")

        rows = conn.execute(f"SELECT * FROM {quote_ident(table)}").fetchall()
        row_counts[table] = len(rows)
        if not rows:
            continue

        cols_sql = ", ".join(quote_ident(c) for c in col_names)
        for row in rows:
            vals_sql = ", ".join(sql_value(row[c], col_types[c]) for c in col_names)
            lines.append(f"INSERT INTO {quote_ident(table)} ({cols_sql}) VALUES ({vals_sql});")

    lines.append("COMMIT;")
    sql_out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    conn.close()
    return tables, row_counts


def import_sql(sql_file: Path, pg_container: str, pg_db: str, pg_user: str) -> None:
    with sql_file.open("rb") as f:
        proc = subprocess.run(
            ["docker", "exec", "-i", pg_container, "psql", "-v", "ON_ERROR_STOP=1", "-U", pg_user, "-d", pg_db],
            stdin=f,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
            text=True,
        )
    if proc.returncode != 0:
        raise RuntimeError(proc.stdout)


def count_in_postgres(table: str, pg_container: str, pg_db: str, pg_user: str) -> int:
    query = f'SELECT COUNT(*) FROM {quote_ident(table)};'
    proc = subprocess.run(
        ["docker", "exec", "-i", pg_container, "psql", "-tAc", query, "-U", pg_user, "-d", pg_db],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        text=True,
    )
    if proc.returncode != 0:
        return -1
    try:
        return int(proc.stdout.strip() or "0")
    except ValueError:
        return -1


def main():
    parser = argparse.ArgumentParser(description="Migrate Strapi SQLite data to PostgreSQL via SQL generation.")
    parser.add_argument("--sqlite", default="apps/strapi/.tmp/data.db", help="Path to Strapi SQLite database")
    parser.add_argument("--sql-out", default="tmp/strapi-migration/strapi_sqlite_to_pg.sql", help="Generated SQL output path")
    parser.add_argument("--pg-container", default="commerce-postgres", help="Postgres docker container name")
    parser.add_argument("--pg-db", default="medusa", help="Postgres database name")
    parser.add_argument("--pg-user", default="postgres", help="Postgres user")
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite)
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite DB not found: {sqlite_path}")

    sql_out = Path(args.sql_out)
    sql_out.parent.mkdir(parents=True, exist_ok=True)

    tables, sqlite_counts = build_sql(sqlite_path, sql_out)
    print(f"Generated SQL: {sql_out} (tables={len(tables)})")

    import_sql(sql_out, args.pg_container, args.pg_db, args.pg_user)
    print("Import to PostgreSQL completed.")

    mismatches = []
    for t in tables:
        pg_count = count_in_postgres(t, args.pg_container, args.pg_db, args.pg_user)
        if pg_count != sqlite_counts[t]:
            mismatches.append((t, sqlite_counts[t], pg_count))

    if mismatches:
        print("Row count mismatches:")
        for t, s, p in mismatches:
            print(f"  {t}: sqlite={s}, postgres={p}")
    else:
        print("Row counts verified for all migrated tables.")


if __name__ == "__main__":
    main()
