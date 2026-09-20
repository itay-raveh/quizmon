# Quizmon Helm chart

Runs database migrations, deploys the matching Worker, and optionally runs PowerSync. The release Job checks the selected release before migration and deployment.

## Requirements

- A Quizmon release image, pinned by digest.
- Existing Kubernetes Secrets for Worker secrets, Cloudflare deployment credentials, and the migration connection.
- For PowerSync: prepared source schema and publication, bucket database, roles, TLS, and authentication endpoint. Both PostgreSQL URIs must use `verify-full`.

Infrastructure supplies the databases, certificates, networking, Secrets, and Flux resources.

## Configuration

Set these in your environment's Helm values. See [values.yaml](values.yaml) for defaults and [values.schema.json](values.schema.json) for validation rules.

| Value | Usage |
| --- | --- |
| `releaseImage.repository`, `releaseImage.digest` | Release image repository and `sha256:` digest. |
| `runtimeConfig` | [Public application configuration](../../deploy/release-config.ts). |
| `inputs.workerSecrets` | Secret reference for Worker credentials. |
| `inputs.migrationConnection` | Secret reference for the PostgreSQL migration connection. |
| `inputs.cloudflare` | Secret containing JSON with `accountId` and `token` for Cloudflare deployment. |
| `release.mode` | `deploy` (default) or `preflight` to validate without migrations or deployment. |
| `powersync.enabled` | Run PowerSync. Default: `false`. |
| `powersync.sourceSecret`, `powersync.storageSecret` | Secret references for the source and bucket database URIs. Required when PowerSync is enabled. |

Each Secret reference has `name`, `key`, and `revision` fields. Supply references here; keep credentials in Kubernetes Secrets.

## Validate

With dependencies installed and Helm 4.3.0 and kubeconform 0.8.0 available through mise, run from the repository root:

```sh
npm run check:chart
```

Checks rendering, invalid inputs, upgrade behavior, Helm lint, and Kubernetes schemas without a cluster. Success ends with `Helm passed`.

## Upgrades

- Change a Secret reference's `revision` when its credentials change.
- Bump the chart version when changing templates. The release Job name changes with the chart version or values; identical inputs retain the completed Job.
- The Job can read only its release-selection ConfigMap. It cannot list resources or read Secrets through the Kubernetes API.
- PowerSync runs one replica behind a ClusterIP Service. Infrastructure routes its public endpoint. Upgrades interrupt sync while the Pod is replaced; local play continues.
