# Quizmon Helm chart

Migrates the account database and runs RxServer. The Worker deploys through GitHub Actions.

## Requirements

- A Quizmon release image, pinned by digest.
- A PostgreSQL migration connection Secret for the account database.
- For RxServer: a MongoDB connection Secret, a public account origin that serves Better Auth JWKS, and Reloader watching the sync Deployment's MongoDB Secrets.

Infrastructure supplies the databases, certificates, networking, Secrets, and Flux resources.

## Configuration

Set these in your environment's Helm values. See [values.yaml](values.yaml) for defaults and [values.schema.json](values.schema.json) for validation rules.

| Value | Usage |
| --- | --- |
| `releaseImage.repository`, `releaseImage.digest` | Release image repository and `sha256:` digest. |
| `runtimeConfig` | [Public application configuration](../../deploy/release-config.ts), used by RxServer. |
| `inputs.migrationConnection` | Secret reference for the PostgreSQL migration connection. |
| `sync.enabled` | Run RxServer. Default: `false`. |
| `sync.mongoSecret` | Secret reference for the MongoDB URI. Required when sync is enabled. |
| `sync.mongoTlsSecret` | Secret reference for the MongoDB client certificate and CA. |

Supply Secret references here; keep credentials in Kubernetes Secrets.

## Validate

With dependencies installed and Helm 4.3.0 and kubeconform 0.8.0 available through mise, run from the repository root:

```sh
mise run check:chart
```

Checks rendering, invalid inputs, upgrade behavior, Helm lint, and Kubernetes schemas without a cluster. Success ends with `Helm passed`.

## Upgrades

- Reloader restarts RxServer when either MongoDB Secret changes.
- Bump the chart version when changing templates.
- RxServer runs one replica behind a ClusterIP Service. Infrastructure routes its public endpoint. Upgrades interrupt sync while the Pod is replaced; local play continues.
