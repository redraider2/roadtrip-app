import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bootstrapSchema = await readFile(
  new URL("../roadtrip_schema.sql", import.meta.url),
  "utf8"
);
const migration = await readFile(
  new URL(
    "../backend/migrations/20260909_add_game_day_guide_fields.sql",
    import.meta.url
  ),
  "utf8"
);

const fields = [
  ["parking_arrival", "JSONB"],
  ["parking_url", "TEXT"],
  ["know_before_you_go", "JSONB"],
  ["policies_url", "TEXT"],
  ["traditions", "JSONB"],
  ["traditions_url", "TEXT"],
];

const arrayFields = [
  "parking_arrival",
  "know_before_you_go",
  "traditions",
];

test("bootstrap schema contains every Game Day guide field", () => {
  for (const [field, type] of fields) {
    assert.match(
      bootstrapSchema,
      new RegExp(`\\b${field}\\s+${type}\\b`, "i"),
      `${field} must be ${type}`
    );
  }

  for (const field of arrayFields) {
    assert.match(
      bootstrapSchema,
      new RegExp(`${field}\\s+JSONB\\s+NOT NULL\\s+DEFAULT\\s+'\\[\\]'::jsonb`, "i"),
      `${field} must default to a non-null JSONB array`
    );
  }
});

test("bootstrap schema and migration share named JSONB array constraints", () => {
  for (const field of arrayFields) {
    const constraint = `tailgating_guides_${field}_array_chk`;

    assert.ok(bootstrapSchema.includes(constraint), `${constraint} missing from bootstrap`);
    assert.ok(migration.includes(constraint), `${constraint} missing from migration`);
    assert.match(
      bootstrapSchema,
      new RegExp(`jsonb_typeof\\(${field}\\)\\s*=\\s*'array'`, "i")
    );
  }
});

test("migration is transactional, idempotent, and repairs compatible columns", () => {
  assert.doesNotMatch(
    migration,
    /^\\/m,
    "migration must not require psql meta-commands"
  );
  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);

  for (const [field, type] of fields) {
    assert.match(
      migration,
      new RegExp(`ADD COLUMN IF NOT EXISTS\\s+${field}\\s+${type}`, "i")
    );
    assert.ok(migration.includes(`('${field}', '${type.toLowerCase()}')`));
  }

  for (const field of arrayFields) {
    assert.match(
      migration,
      new RegExp(`SET\\s+${field}\\s*=\\s*'\\[\\]'::jsonb[\\s\\S]*WHERE\\s+${field}\\s+IS NULL`, "i")
    );
    assert.match(
      migration,
      new RegExp(`ALTER COLUMN\\s+${field}\\s+SET DEFAULT\\s+'\\[\\]'::jsonb`, "i")
    );
    assert.match(
      migration,
      new RegExp(`ALTER COLUMN\\s+${field}\\s+SET NOT NULL`, "i")
    );
    assert.match(
      migration,
      new RegExp(`VALIDATE CONSTRAINT\\s+tailgating_guides_${field}_array_chk`, "i")
    );
  }
});

test("first and repeated execution use idempotent column and constraint guards", () => {
  assert.equal(
    [...migration.matchAll(/ADD COLUMN IF NOT EXISTS/g)].length,
    fields.length
  );
  assert.match(migration, /IF existing_definition IS NULL THEN/);
  assert.match(migration, /ADD CONSTRAINT %I CHECK/);
  assert.match(migration, /VALIDATE CONSTRAINT/);
});

test("compatible existing columns are normalized before nullability is enforced", () => {
  for (const field of arrayFields) {
    const backfillIndex = migration.indexOf(`SET ${field} = '[]'::jsonb`);
    const notNullIndex = migration.indexOf(`ALTER COLUMN ${field} SET NOT NULL`);

    assert.notEqual(backfillIndex, -1, `${field} null backfill is missing`);
    assert.notEqual(notNullIndex, -1, `${field} NOT NULL repair is missing`);
    assert.ok(backfillIndex < notNullIndex, `${field} must be backfilled first`);
  }
});

test("incompatible existing column types fail explicitly", () => {
  assert.match(migration, /actual_type IS DISTINCT FROM field\.data_type/);
  assert.match(migration, /has incompatible type/);
  assert.match(migration, /RAISE EXCEPTION/);
});

test("non-array JSONB fails validation before the transaction can commit", () => {
  const validationIndex = migration.lastIndexOf("VALIDATE CONSTRAINT");
  const commitIndex = migration.lastIndexOf("COMMIT;");

  assert.notEqual(validationIndex, -1);
  assert.ok(validationIndex < commitIndex);
  assert.match(migration, /CHECK \(jsonb_typeof\(%I\) = ''array''\) NOT VALID/);
});

test("same-named constraints must be checks on exactly the expected column", () => {
  assert.match(migration, /existing_type <> 'c'/);
  assert.match(
    migration,
    /existing_columns IS DISTINCT FROM ARRAY\[expected_column\]::SMALLINT\[\]/
  );
  assert.match(migration, /exists with an incompatible definition/);
});
