# SCF Pipeline — Backend Fixes Needed

Issues found during API QA on 2026-03-28. All are data pipeline / silver layer issues.
The API has workarounds in place where noted — those can be removed once the pipeline is fixed.

---

## 1. Image field — Airtable attachment format stored as string

**Problem:** `silver_scf_projects.image` (and `coverImage`) stores the Airtable attachment object serialized as `"filename (https://url)"` instead of just the URL.

**What API consumers see:**
```json
"image": "afe8f492 (https://v5.airtableusercontent.com/v3/u/51/51/...)"
```

**Should be:**
```json
"image": "https://v5.airtableusercontent.com/v3/u/51/51/..."
```

**Fix:** In the ETL that writes to `silver_scf_projects`, extract only the `url` field from the Airtable attachment object before storing.

**API workaround in place:** `extractImageUrl()` in `server/adapters/scf.ts` strips the filename prefix using regex `\(([^)]+)\)$`. Remove this once pipeline is fixed.

---

## 2. `attestationIssuersURI` stored as string `"[]"` instead of NULL

**Problem:** `silver_scf_projects.attestationIssuersURI` stores the string `"[]"` when there are no values, rather than `NULL`.

**What API consumers see:**
```json
"attestationIssuersURI": "[]"
```

**Should be:** field omitted entirely (NULL in DB → `undefined` in API response).

**Fix:** In the ETL, write `NULL` when the attestation issuers list is empty.

**Affected rows:** 100% of project records (602 projects).

---

## 3. `relevantTo` always empty

**Problem:** `silver_scf_projects.relevantTo` is always an empty array `[]` across all 602 projects.

**Question for pipeline team:** Does the SCF Airtable source have a categories/tags field that should map to `relevantTo`? If yes, wire it up. If no, store `NULL` rather than `[]` so the field is omitted in API responses.

**Affected rows:** 100% of project records.

---

## 4. Inconsistent extension namespaces across entity types

**Problem:** The three SCF entity types use two different extension namespaces, which is confusing for API consumers building against all three.

| Entity | Extension namespace | Column prefix in silver table |
|--------|--------------------|-----------------------------|
| Grant Pools | `extensions["org.stellar.communityfund"]` | `org.stellar.communityfund.*` |
| Projects | `extensions["org.stellar.communityfund"]` | `org.stellar.communityfund.*` |
| Applications | `extensions["io.scf"]` | `io.scf.*` |

A consumer building a full SCF integration needs to know two different namespaces to read extension data. Ideally all three use the same namespace.

**Fix options:**
- **Option A:** Rename `io.scf.*` columns in `silver_scf_grant_applications` to `org.stellar.communityfund.*` — consistent with pools and projects
- **Option B:** Rename `org.stellar.communityfund.*` columns in pools/projects to `io.scf.*` — shorter namespace

If the namespace is changed in the pipeline, the column prefix check in `server/adapters/scf.ts` → `mapRowToApplication()` must be updated to match.

---

## Summary

| # | Issue | Affected table | Affected rows | API workaround |
|---|-------|---------------|---------------|----------------|
| 1 | Image stored as `"filename (url)"` | `silver_scf_projects` | ~89% of projects | Yes — regex strip in mapper |
| 2 | `attestationIssuersURI` = `"[]"` string | `silver_scf_projects` | 100% | No |
| 3 | `relevantTo` always empty | `silver_scf_projects` | 100% | No |
| 4 | Inconsistent extension namespaces | `silver_scf_grant_applications` vs others | 100% of applications | No |
