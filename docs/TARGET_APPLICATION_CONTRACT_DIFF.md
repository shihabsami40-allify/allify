# Target application contract diff

Run `supabase/preflight/003_target_contract_diff.sql` on the authoritative Supabase project after the schema inventory and legacy mapping report.

## Purpose

This read-only report compares the exact table/column names used by the current marketplace application with the live `public` schema. It also checks whether the four required application RPC names exist and lists legacy helper/RPC signatures that need to remain compatible during migration.

## How to interpret it

- `MISSING`: the current app expects this column, but it does not exist on the live table.
- `PRESENT`: the column exists. Compare `live_data_type` and `live_udt_name` with the app contract; presence alone is not proof of compatibility.
- `matching_public_overloads = 0`: the expected RPC name is not present in the public schema.
- A present RPC still requires exact argument, return type, SECURITY DEFINER/search_path, execute grants, and RLS dependency review.

## Migration decision

Do not apply `drizzle/migrations/0000_migration.sql` to the live project. It creates table names already occupied by legacy tables with incompatible columns and enum types. Do not try to solve that by adding columns blindly: the current app also expects different foreign-key targets, status enums, RPC signatures, and policies.

The output of this report is a migration input, not permission to write. Before an additive/parallel migration is approved, reconcile every missing column, incompatible type, foreign key, enum value, trigger, policy, and function dependency. Preserve the legacy six tables and their existing rows until a tested replacement path is verified on a restorable database copy.
