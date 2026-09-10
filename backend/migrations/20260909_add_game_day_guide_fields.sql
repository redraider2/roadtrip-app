BEGIN;

ALTER TABLE tailgating_guides
  ADD COLUMN IF NOT EXISTS parking_arrival JSONB,
  ADD COLUMN IF NOT EXISTS parking_url TEXT,
  ADD COLUMN IF NOT EXISTS know_before_you_go JSONB,
  ADD COLUMN IF NOT EXISTS policies_url TEXT,
  ADD COLUMN IF NOT EXISTS traditions JSONB,
  ADD COLUMN IF NOT EXISTS traditions_url TEXT;

DO $migration$
DECLARE
  field RECORD;
  actual_type TEXT;
BEGIN
  FOR field IN
    SELECT *
    FROM (VALUES
      ('parking_arrival', 'jsonb'),
      ('parking_url', 'text'),
      ('know_before_you_go', 'jsonb'),
      ('policies_url', 'text'),
      ('traditions', 'jsonb'),
      ('traditions_url', 'text')
    ) AS expected(column_name, data_type)
  LOOP
    SELECT format_type(attribute.atttypid, attribute.atttypmod)
      INTO actual_type
      FROM pg_attribute AS attribute
     WHERE attribute.attrelid = 'tailgating_guides'::regclass
       AND attribute.attname = field.column_name
       AND attribute.attnum > 0
       AND NOT attribute.attisdropped;

    IF actual_type IS DISTINCT FROM field.data_type THEN
      RAISE EXCEPTION
        'tailgating_guides.% has incompatible type %, expected %',
        field.column_name,
        COALESCE(actual_type, '<missing>'),
        field.data_type;
    END IF;
  END LOOP;
END
$migration$;

UPDATE tailgating_guides
   SET parking_arrival = '[]'::jsonb
 WHERE parking_arrival IS NULL;

UPDATE tailgating_guides
   SET know_before_you_go = '[]'::jsonb
 WHERE know_before_you_go IS NULL;

UPDATE tailgating_guides
   SET traditions = '[]'::jsonb
 WHERE traditions IS NULL;

ALTER TABLE tailgating_guides
  ALTER COLUMN parking_arrival SET DEFAULT '[]'::jsonb,
  ALTER COLUMN parking_arrival SET NOT NULL,
  ALTER COLUMN know_before_you_go SET DEFAULT '[]'::jsonb,
  ALTER COLUMN know_before_you_go SET NOT NULL,
  ALTER COLUMN traditions SET DEFAULT '[]'::jsonb,
  ALTER COLUMN traditions SET NOT NULL;

DO $migration$
DECLARE
  constraint_spec RECORD;
  existing_type "char";
  existing_definition TEXT;
  existing_columns SMALLINT[];
  expected_column SMALLINT;
BEGIN
  FOR constraint_spec IN
    SELECT *
    FROM (VALUES
      ('tailgating_guides_parking_arrival_array_chk', 'parking_arrival'),
      ('tailgating_guides_know_before_you_go_array_chk', 'know_before_you_go'),
      ('tailgating_guides_traditions_array_chk', 'traditions')
    ) AS expected(constraint_name, column_name)
  LOOP
    SELECT attribute.attnum
      INTO expected_column
      FROM pg_attribute AS attribute
     WHERE attribute.attrelid = 'tailgating_guides'::regclass
       AND attribute.attname = constraint_spec.column_name
       AND attribute.attnum > 0
       AND NOT attribute.attisdropped;

    SELECT constraint_record.contype,
           pg_get_constraintdef(constraint_record.oid),
           constraint_record.conkey
      INTO existing_type, existing_definition, existing_columns
      FROM pg_constraint AS constraint_record
     WHERE constraint_record.conrelid = 'tailgating_guides'::regclass
       AND constraint_record.conname = constraint_spec.constraint_name;

    IF existing_definition IS NULL THEN
      EXECUTE format(
        'ALTER TABLE tailgating_guides ADD CONSTRAINT %I CHECK (jsonb_typeof(%I) = ''array'') NOT VALID',
        constraint_spec.constraint_name,
        constraint_spec.column_name
      );
    ELSIF existing_type <> 'c'
       OR existing_columns IS DISTINCT FROM ARRAY[expected_column]::SMALLINT[]
       OR position('jsonb_typeof' IN existing_definition) = 0
       OR position(constraint_spec.column_name IN existing_definition) = 0
       OR position('''array''' IN existing_definition) = 0 THEN
      RAISE EXCEPTION
        'Constraint % exists with an incompatible definition: %',
        constraint_spec.constraint_name,
        existing_definition;
    END IF;
  END LOOP;
END
$migration$;

ALTER TABLE tailgating_guides
  VALIDATE CONSTRAINT tailgating_guides_parking_arrival_array_chk;

ALTER TABLE tailgating_guides
  VALIDATE CONSTRAINT tailgating_guides_know_before_you_go_array_chk;

ALTER TABLE tailgating_guides
  VALIDATE CONSTRAINT tailgating_guides_traditions_array_chk;

COMMIT;
