# API Changelog

All notable changes to the OpenGrants Gateway API are documented here.

---

## 2026-03-28

### New: Stellar Community Fund (SCF) now active

SCF is now a fully supported system alongside Octant and Giveth. All three endpoints are live:

```
GET /api/v1/grantPools?system=scf
GET /api/v1/grantApplications?system=scf
GET /api/v1/projects?system=scf
```

SCF data is sourced from the silver layer of the OpenGrants data pipeline, which stores data in native [DAOIP-5](https://github.com/metagov/daostar/blob/main/DAOIPs/daoip-5.md) schema.

---

### New endpoint: `GET /api/v1/projects`

Projects are now a first-class resource. Supports `system`, `limit`, `offset`, `sortBy`, and `sortOrder` parameters.

```bash
# All SCF projects (602 total)
GET /api/v1/projects?system=scf

# Single project by ID
GET /api/v1/projects/daoip-5:scf:project:warp_drive
```

Response shape:

```json
{
  "@context": "http://www.daostar.org/schemas",
  "data": [
    {
      "type": "Project",
      "id": "daoip-5:scf:project:warp_drive",
      "name": "Warp Drive",
      "description": "...",
      "contentURI": "https://...",
      "image": "https://...",
      "socials": [
        { "name": "GitHub", "value": "https://github.com/..." },
        { "name": "Website", "value": "https://..." }
      ]
    }
  ],
  "pagination": { "totalCount": 602, "totalPages": 121, ... }
}
```

---

### SCF grant pools: 48 rounds, including future rounds

The SCF grant pools dataset includes **all rounds from SCF #1 (2019) through SCF #48 (planned Q4 2026)**. Rounds are created in advance before they open.

**Consumers should filter by phase or pool size** when they only want active or completed rounds:

```bash
# Only open rounds
GET /api/v1/grantPools?system=scf&isOpen=true

# Check phase via extensions
extensions["org.stellar.communityfund"]["org.stellar.communityfund.phase"]
```

**Phase values in the data:**

| Phase | Meaning |
|-------|---------|
| `Not Started` | Round is pre-created, no submissions yet — `totalGrantPoolSize` will be `$0` |
| `Submission` | Currently accepting applications |
| `Panel Review` | Under review |
| `Notification & Award Distribution` | Winners announced, payments in progress |
| `Ended` | Round complete, full historical data available |

As of 2026-03-28, rounds **#44–#48** are `Not Started` with `$0` pool sizes and no close dates. Rounds **#43** is in `Submission` and **#42** is in `Panel Review`.

---

### SCF data quality notes for consumers

- **`totalGrantPoolSize`**: `$0` on not-started and in-progress rounds; populated once the round ends
- **`closeDate`**: Not set on future rounds; present as a human-readable string (e.g. `"March 12, 2023"`) on completed rounds
- **`attestationIssuersURI`**: Returns `"[]"` (empty) — pipeline fix pending
- **`relevantTo`**: Returns `[]` (empty) — pipeline fix pending
- **`image`**: Clean URL (e.g. `"https://v5.airtableusercontent.com/..."`)
- **`socials`**: Array of `{ name, value }` objects — 93% of projects have at least one

---

### Bug fixes

- **Server stability**: Fixed a crash (`ERR_HTTP_HEADERS_SENT`) where the 25-second request timeout middleware would fire a `408` response, then async route catch blocks would attempt a second `500` response. All route handlers now guard against double-response on timeout.
- **Rate limits in docs**: Corrected from `1000/hr` / `100/hr` to the actual `100/min` / `20/min` enforced by the middleware.

---

### Updated: `GET /api/v1/docs`

The `/api/v1/docs` endpoint now returns correct endpoint paths and lists all three supported systems:

```json
{
  "supportedSystems": ["octant", "giveth", "scf"],
  "endpoints": {
    "systems": "/api/v1/grantSystems",
    "pools": "/api/v1/grantPools",
    "applications": "/api/v1/grantApplications",
    "projects": "/api/v1/projects"
  }
}
```
