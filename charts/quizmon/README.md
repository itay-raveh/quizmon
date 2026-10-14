# Quizmon Helm chart

Migrates the account database and runs RxServer. The Worker deploys through GitHub Actions.

## Requirements

- A published Quizmon OCI chart, which bundles the tested release image digest.
- A PostgreSQL migration connection Secret for the account database.
- For RxServer: a MongoDB connection Secret, a public account origin that serves Better Auth JWKS, and Reloader watching the sync Deployment's MongoDB Secrets.

Infrastructure supplies the databases, certificates, networking, Secrets, and Flux resources.

## Configuration

Set these in your environment's Helm values. See [values.yaml](values.yaml) for defaults and [values.schema.json](values.schema.json) for validation rules.

| Value | Usage |
| --- | --- |
| `releaseImage.repository`, `releaseImage.digest` | Bundled release image repository and `sha256:` digest. Infrastructure must not override these. |
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

Checks image binding, incompatible production values, chart-only upgrade behavior, Helm lint, Kubernetes schemas, and RxServer wiring without a cluster.

## Release artifacts

Successful [`main` CI runs](../../.github/workflows/ci.yml) publish `ghcr.io/itay-raveh/charts/quizmon` for runtime or chart changes. Published versions are `0.<CI run number>.<run attempt>`; `appVersion` records the tested source commit. The chart bundles the exact checked image digest and chart templates. Publication [validates production values](../../deploy/prepare-release-chart.ts) against the chart schema and Kubernetes schemas using a pinned infra checkout, whose commit appears in the release summary. Environment configuration and Secret references stay in infra.

The Worker deploys independently through the existing [release workflow](../../.github/workflows/release.yml) before chart publication. A Worker deployment failure prevents chart publication, but Kubernetes and Cloudflare deployment remain separate operations. Changes must preserve compatibility during that interval. The release summary records the image reference and OCI chart digest; retain published versions for rollback.

Flux tracks stable OCI chart versions. Infrastructure owns the [cutover, hold, and rollback procedure](https://github.com/itay-raveh/infra/blob/main/docs/deploying.md#application-releases). A chart rollback does not reverse database migrations or roll back the Worker; use the verified recovery backup and the existing Worker release process when those need recovery.

## Upgrades

- Reloader restarts RxServer when either MongoDB Secret changes.
- CI assigns a new chart version automatically when runtime or templates change.
- RxServer runs one replica behind a ClusterIP Service. Infrastructure routes its public endpoint. Upgrades interrupt sync while the Pod is replaced; local play continues.
