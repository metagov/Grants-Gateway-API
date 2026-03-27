# SCF Pipeline — Backend Fixes

Issues found during API QA on 2026-03-28.
All four fixed in pipeline `daoip5_scf.yaml v1.0.11` on 2026-03-28.

---

## 1. Image URLs — ✅ Fixed in pipeline v1.0.11

**Was:** ETL stored Airtable attachment as `"filename (https://url)"` string.
**Fix:** Pipeline now strips filename prefix and stores just the bare URL.
**API workaround removed:** `extractImageUrl()` helper deleted from `server/adapters/scf.ts`.

---

## 2. `attestationIssuersURI` stored as `"[]"` — ✅ Fixed in pipeline v1.0.11

**Was:** Writing empty JSON array as the string `"[]"`.
**Fix:** Pipeline now writes `NULL` — field is omitted cleanly in API responses.

---

## 3. `relevantTo` stored as `"[]"` — ✅ Fixed in pipeline v1.0.11

**Was:** Writing empty array `[]` with no source data mapped.
**Fix:** Pipeline now writes `NULL` — field is omitted cleanly in API responses.

---

## 4. Inconsistent extension namespaces — ✅ Fixed in pipeline v1.0.11

**Was:** Applications used `io.scf.*` column prefix; pools and projects used `org.stellar.communityfund.*`.
**Fix:** All three entity types now consistently use `org.stellar.communityfund.*`.
**API updated:** `mapRowToApplication()` in `server/adapters/scf.ts` updated from `io.scf.*` → `org.stellar.communityfund.*`. Extension key in responses changed from `extensions["io.scf"]` → `extensions["org.stellar.communityfund"]`.

**Breaking change for existing consumers:** Any client reading `extensions["io.scf"]` from application responses must update to `extensions["org.stellar.communityfund"]`.
