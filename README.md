# nodejs-container-app

A simple Node.js/Express web application packaged as a production-ready container, with a full GitHub Actions CI pipeline that integrates **TrendAI TMAS** (Trend Micro Artifact Scanner) for vulnerability, malware, and secret scanning.

---

## Project Structure

```
nodejs-container-app/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI pipeline (test → build → TMAS scan)
├── src/
│   ├── app.js                  # Express application
│   └── app.test.js             # Jest unit tests
├── .dockerignore
├── .gitignore
├── Dockerfile                  # Multi-stage, non-root production build
├── package.json
├── tmas_overrides.yml          # TMAS false-positive suppression rules
└── README.md
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | Local development |
| Docker | ≥ 24 | Build & run container |
| Git | any | Version control |
| GitHub account | — | CI/CD hosting |
| TrendAI Vision One account | — | TMAS scanning |

---

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Run the app locally
```bash
npm start
# → Server running on port 3000
```

### 3. Run tests
```bash
npm test
```

### 4. Build and run as a container
```bash
docker build -t nodejs-container-app:local .
docker run -p 3000:3000 nodejs-container-app:local
```

### 5. Test the endpoints
```bash
curl http://localhost:3000/
curl http://localhost:3000/health
curl http://localhost:3000/info
```

---

## Upload to GitHub

### Step 1 – Create a new GitHub repository

1. Log in to [github.com](https://github.com).
2. Click **New repository**.
3. Name it `nodejs-container-app` (or your preference).
4. Set visibility to **Public** or **Private**.
5. Do **not** initialize with a README (you already have one).
6. Click **Create repository**.

### Step 2 – Push your local code

```bash
cd nodejs-container-app

git init
git add .
git commit -m "Initial commit: Node.js container app with TMAS CI"

# Replace <YOUR_USERNAME> with your GitHub username
git remote add origin https://github.com/<YOUR_USERNAME>/nodejs-container-app.git
git branch -M main
git push -u origin main
```

---

## TMAS Setup in GitHub

### Step 1 – Obtain your TrendAI Vision One API Key

1. Log in to the [Trend Vision One console](https://portal.xdr.trendmicro.com).
2. Navigate to **Administration → API Keys**.
3. Click **Add API Key**.
4. Assign the **Scanner** role.
5. Copy the generated API key — you will not be able to see it again.

> **Regions:** Choose the region that matches your Vision One account:
> `us-east-1` | `eu-central-1` | `eu-west-2` | `ca-central-1` |
> `ap-southeast-2` | `ap-south-1` | `ap-northeast-1` | `ap-southeast-1` | `me-central-1`

### Step 2 – Add the API Key as a GitHub Secret

1. In your GitHub repository, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `TMAS_API_KEY`
4. Value: *(paste your Vision One API key)*
5. Click **Add secret**.

### Step 3 – (Optional) Set your region as a variable

If your region is not `us-east-1`, set it as a repository variable:

1. **Settings → Secrets and variables → Actions → Variables tab**
2. Click **New repository variable**
3. Name: `TMAS_REGION`
4. Value: e.g. `eu-central-1`

> The workflow defaults to `us-east-1` if this variable is not set.

### Step 4 – Enable GitHub Actions

GitHub Actions is enabled by default. Verify at:
**Settings → Actions → General → Allow all actions and reusable workflows**

---

## CI Pipeline Overview

The workflow (`.github/workflows/ci.yml`) runs on every **push** to `main`/`develop` and every **pull request** to `main`.

```
push / pull_request
        │
        ▼
┌─────────────────┐
│  JOB 1: test    │  Run Jest unit tests + upload coverage report
└────────┬────────┘
         │ (on success)
    ┌────┴────────────────┐
    │                     │
    ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ JOB 2:           │  │ JOB 3:           │
│ tmas-source-scan │  │ build-image      │
│                  │  │                  │
│ Scans repo dir   │  │ docker build →   │
│ for CVEs +       │  │ export .tar      │
│ secrets          │  └────────┬─────────┘
└──────────────────┘           │ (on success)
                               ▼
                    ┌──────────────────────┐
                    │ JOB 4:               │
                    │ tmas-container-scan  │
                    │                      │
                    │ Scans image tarball  │
                    │ for CVEs + malware   │
                    │ + secrets + SBOM     │
                    └──────────────────────┘
```

| Job | Scanner | What It Catches |
|-----|---------|----------------|
| `tmas-source-scan` | Vulnerabilities + Secrets | CVEs in npm packages, exposed API keys/tokens in source code |
| `tmas-container-scan` | Vulnerabilities + Malware + Secrets | CVEs in OS/npm layers, embedded malware, baked-in secrets, generates SBOM |

### Artifacts saved per run
- **coverage-report** – Jest coverage HTML (14 days)
- **docker-image** – Built image tarball (1 day)
- **sbom** – `SBOM.json` from TMAS container scan (30 days)

### PR Comments
On pull requests, the TMAS action automatically posts a comment summarizing findings — no additional configuration required.

---

## TMAS Firewall / Network Requirements

If you are using **GitHub Enterprise** with network allowlists, add the following domain for TMAS CLI downloads:

```
ast-cli.xdr.trendmicro.com
```

---

## Suppressing False Positives

Edit `tmas_overrides.yml` to document accepted risks:

```yaml
vulnerabilities:
  exceptions:
    - id: CVE-2023-XXXXX
      reason: "Not exploitable in our context"

secrets:
  exceptions:
    - id: "generic-api-key"
      path: "src/fixtures/test-data.js"
      reason: "Test fixture only"
```

To use overrides locally:
```bash
tmas scan dir:. --region us-east-1 -VS --override ./tmas_overrides.yml
```

To add overrides to the GitHub Action, append to `additionalArgs`:
```yaml
additionalArgs: --region=us-east-1 --override ./tmas_overrides.yml
```

---

## Running TMAS Locally

```bash
# Install TMAS CLI
curl -sL "https://ast-cli.xdr.trendmicro.com/tmas-cli/latest/tmas-cli_$(uname -s)_$(uname -m).tar.gz" \
  | tar xz -C /usr/local/bin tmas

# Set API key
export TMAS_API_KEY="your-vision-one-api-key"

# Scan source directory
tmas scan dir:. --region us-east-1 -VS

# Build and scan container image
docker build -t nodejs-container-app:scan .
tmas scan docker:nodejs-container-app:scan --region us-east-1 -VMS --saveSBOM
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Returns greeting, version, hostname |
| GET | `/health` | Health check (used by Docker HEALTHCHECK) |
| GET | `/info` | Node.js runtime info |

---

## License

MIT
