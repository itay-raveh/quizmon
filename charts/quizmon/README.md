# Quizmon Helm chart

Runs database migrations and optionally runs PowerSync. The Worker deploys through GitHub Actions.

## Requirements

- A Quizmon release image, pinned by digest.
- An existing Kubernetes Secret for the migration connection.
- For PowerSync: prepared source schema and publication, bucket database, roles, TLS, and authentication endpoint. Both PostgreSQL URIs must use `verify-full`.

Infrastructure supplies the databases, certificates, networking, Secrets, and Flux resources.

## Configuration

Set these in your environment's Helm values. See [values.yaml](values.yaml) for defaults and [values.schema.json](values.schema.json) for validation rules.

| Value | Usage |
| --- | --- |
| `releaseImage.repository`, `releaseImage.digest` | Migration image repository and `sha256:` digest. |
| `runtimeConfig` | [Public application configuration](../../deploy/release-config.ts), used by PowerSync. |
| `inputs.migrationConnection` | Secret reference for the PostgreSQL migration connection. |
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
- Bump the chart version when changing templates. The migration Job name changes with the chart version, image digest, migration Secret reference, or Job settings. Identical inputs retain the completed Job.
- The Job mounts only its migration Secret and has no Kubernetes API access.
- PowerSync runs one replica behind a ClusterIP Service. Infrastructure routes its public endpoint. Upgrades interrupt sync while the Pod is replaced; local play continues.
