-- Migration script for updating lesson tests from old format to new format
-- This script helps migrate existing lessons to the new test_cases format

-- ==============================================================================
-- BACKUP EXISTING DATA
-- ==============================================================================

-- Create backup table
CREATE TABLE IF NOT EXISTS lesson_items_backup AS
SELECT * FROM lesson_items;

-- ==============================================================================
-- MIGRATION FUNCTIONS
-- ==============================================================================

-- Function to migrate a single lesson item from old to new format
CREATE OR REPLACE FUNCTION migrate_lesson_tests()
RETURNS void AS $$
BEGIN
  -- Migrate lessons that have expected_stdout format to test_cases format
  UPDATE lesson_items
  SET tests = jsonb_build_object(
    'test_cases',
    jsonb_build_array(
      jsonb_build_object(
        'expected_output', tests->>'expected_stdout',
        'description', 'Основной тест'
      )
    )
  )
  WHERE tests ? 'expected_stdout'
    AND NOT tests ? 'test_cases';
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- EXAMPLE: Manual migration for specific lessons
-- ==============================================================================

-- Example 1: Simple "Hello, World!" test
-- Before: {"expected_stdout": "Hello, World!"}
-- After:
UPDATE lesson_items
SET tests = '{
  "test_cases": [
    {
      "expected_output": "Hello, World!",
      "description": "Вывод приветствия"
    }
  ]
}'::jsonb
WHERE id = 'YOUR_LESSON_ITEM_ID';

-- Example 2: Multiple test cases for a calculator
-- Test addition, subtraction, etc.
UPDATE lesson_items
SET tests = '{
  "test_cases": [
    {
      "input": "2 3",
      "expected_output": "5",
      "description": "Сложение: 2 + 3 = 5"
    },
    {
      "input": "10 5",
      "expected_output": "15",
      "description": "Сложение: 10 + 5 = 15"
    },
    {
      "input": "100 50",
      "expected_output": "150",
      "description": "Сложение больших чисел"
    }
  ]
}'::jsonb
WHERE slug = 'calculator-addition';

-- Example 3: Fibonacci sequence
UPDATE lesson_items
SET tests = '{
  "test_cases": [
    {
      "input": "1",
      "expected_output": "1",
      "description": "Первое число Фибоначчи"
    },
    {
      "input": "5",
      "expected_output": "5",
      "description": "5-е число Фибоначчи"
    },
    {
      "input": "10",
      "expected_output": "55",
      "description": "10-е число Фибоначчи"
    },
    {
      "input": "15",
      "expected_output": "610",
      "description": "15-е число Фибоначчи"
    }
  ]
}'::jsonb
WHERE slug = 'fibonacci-sequence';

-- Example 4: Palindrome checker
UPDATE lesson_items
SET tests = '{
  "test_cases": [
    {
      "input": "level",
      "expected_output": "true",
      "description": "Простой палиндром"
    },
    {
      "input": "hello",
      "expected_output": "false",
      "description": "Не палиндром"
    },
    {
      "input": "A man a plan a canal Panama",
      "expected_output": "true",
      "description": "Палиндром с пробелами"
    },
    {
      "input": "racecar",
      "expected_output": "true",
      "description": "Палиндром без пробелов"
    }
  ]
}'::jsonb
WHERE slug = 'palindrome-checker';

-- ==============================================================================
-- BULK MIGRATION
-- ==============================================================================

-- Migrate all lessons at once (use with caution!)
-- This will convert all old format tests to new format
SELECT migrate_lesson_tests();

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Check lessons with old format
SELECT
  li.id,
  l.title,
  l.slug,
  li.tests
FROM lesson_items li
JOIN lessons l ON l.id = li.lesson_id
WHERE li.tests ? 'expected_stdout'
  AND NOT li.tests ? 'test_cases';

-- Check lessons with new format
SELECT
  li.id,
  l.title,
  l.slug,
  li.tests->'test_cases' as test_cases,
  jsonb_array_length(li.tests->'test_cases') as test_count
FROM lesson_items li
JOIN lessons l ON l.id = li.lesson_id
WHERE li.tests ? 'test_cases';

-- Check lessons without any tests
SELECT
  li.id,
  l.title,
  l.slug,
  li.tests
FROM lesson_items li
JOIN lessons l ON l.id = li.lesson_id
WHERE li.tests IS NULL
   OR li.tests = '{}'::jsonb
   OR (NOT li.tests ? 'test_cases' AND NOT li.tests ? 'expected_stdout');

-- ==============================================================================
-- ROLLBACK (if needed)
-- ==============================================================================

-- Restore from backup
-- WARNING: This will overwrite all current data!
-- TRUNCATE lesson_items;
-- INSERT INTO lesson_items SELECT * FROM lesson_items_backup;

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function to add a test case to existing lesson
CREATE OR REPLACE FUNCTION add_test_case(
  p_lesson_item_id UUID,
  p_input TEXT,
  p_expected_output TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_tests jsonb;
  v_new_test jsonb;
BEGIN
  -- Get current tests
  SELECT tests INTO v_tests
  FROM lesson_items
  WHERE id = p_lesson_item_id;

  -- Create new test case
  v_new_test := jsonb_build_object(
    'input', p_input,
    'expected_output', p_expected_output,
    'description', p_description
  );

  -- If no test_cases array exists, create it
  IF v_tests IS NULL OR NOT v_tests ? 'test_cases' THEN
    v_tests := jsonb_build_object('test_cases', jsonb_build_array());
  END IF;

  -- Append new test case
  UPDATE lesson_items
  SET tests = jsonb_set(
    v_tests,
    '{test_cases}',
    v_tests->'test_cases' || v_new_test
  )
  WHERE id = p_lesson_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to remove a test case by index
CREATE OR REPLACE FUNCTION remove_test_case(
  p_lesson_item_id UUID,
  p_index INTEGER
)
RETURNS void AS $$
DECLARE
  v_tests jsonb;
  v_test_cases jsonb;
BEGIN
  SELECT tests INTO v_tests
  FROM lesson_items
  WHERE id = p_lesson_item_id;

  IF v_tests ? 'test_cases' THEN
    v_test_cases := v_tests->'test_cases';
    v_test_cases := v_test_cases - p_index;

    UPDATE lesson_items
    SET tests = jsonb_set(v_tests, '{test_cases}', v_test_cases)
    WHERE id = p_lesson_item_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- USAGE EXAMPLES
-- ==============================================================================

-- Add a test case to a lesson
-- SELECT add_test_case(
--   'YOUR_LESSON_ITEM_ID'::uuid,
--   '5',
--   '25',
--   'Квадрат числа 5'
-- );

-- Remove test case at index 1
-- SELECT remove_test_case('YOUR_LESSON_ITEM_ID'::uuid, 1);

-- ==============================================================================
-- VALIDATION QUERIES
-- ==============================================================================

-- Validate test_cases structure
SELECT
  li.id,
  l.title,
  CASE
    WHEN li.tests ? 'test_cases' THEN
      CASE
        WHEN jsonb_typeof(li.tests->'test_cases') = 'array' THEN '✓ Valid array'
        ELSE '✗ Not an array'
      END
    ELSE '✗ No test_cases'
  END as validation_status,
  COALESCE(jsonb_array_length(li.tests->'test_cases'), 0) as test_count
FROM lesson_items li
JOIN lessons l ON l.id = li.lesson_id
WHERE li.tests IS NOT NULL;

-- Check for required fields in test cases
SELECT
  li.id,
  l.title,
  tc.ordinality as test_number,
  tc.value->'expected_output' IS NOT NULL as has_expected_output,
  tc.value->'description' IS NOT NULL as has_description,
  tc.value->'input' IS NOT NULL as has_input
FROM lesson_items li
JOIN lessons l ON l.id = li.lesson_id,
LATERAL jsonb_array_elements(li.tests->'test_cases') WITH ORDINALITY tc
WHERE li.tests ? 'test_cases';

-- ==============================================================================
-- STATISTICS
-- ==============================================================================

-- Count lessons by test format
SELECT
  CASE
    WHEN tests ? 'test_cases' THEN 'Новый формат (test_cases)'
    WHEN tests ? 'expected_stdout' THEN 'Старый формат (expected_stdout)'
    WHEN tests IS NULL OR tests = '{}'::jsonb THEN 'Без тестов'
    ELSE 'Другой формат'
  END as format_type,
  COUNT(*) as count
FROM lesson_items
GROUP BY format_type;

-- Average number of test cases per lesson
SELECT
  AVG(jsonb_array_length(tests->'test_cases')) as avg_test_cases,
  MIN(jsonb_array_length(tests->'test_cases')) as min_test_cases,
  MAX(jsonb_array_length(tests->'test_cases')) as max_test_cases
FROM lesson_items
WHERE tests ? 'test_cases';

-- ==============================================================================
-- CLEANUP
-- ==============================================================================

-- Drop backup table after successful migration
-- DROP TABLE IF EXISTS lesson_items_backup;

-- Drop helper functions if no longer needed
-- DROP FUNCTION IF EXISTS migrate_lesson_tests();
-- DROP FUNCTION IF EXISTS add_test_case(UUID, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS remove_test_case(UUID, INTEGER);

-- ==============================================================================
-- NOTES
-- ==============================================================================

/*
1. Always backup your data before running migration scripts
2. Test on a development database first
3. The old format (expected_stdout) will still work with the new system
4. You can gradually migrate lessons to the new format
5. New format supports multiple test cases with descriptions
6. Input field is optional (for programs without user input)
7. Each test case must have at least 'expected_output'
*/
