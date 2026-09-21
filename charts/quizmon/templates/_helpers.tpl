{{- define "quizmon.name" -}}
{{- printf "%s-quizmon" .Release.Name | trunc 40 | trimSuffix "-" -}}
{{- end -}}

{{- define "quizmon.image" -}}
{{- printf "%s@%s" .Values.releaseImage.repository .Values.releaseImage.digest -}}
{{- end -}}

{{- define "quizmon.releaseName" -}}
{{- printf "%s-migration-%s" (include "quizmon.name" .) (dict "image" .Values.releaseImage "migration" .Values.inputs.migrationConnection "deadline" .Values.release.activeDeadlineSeconds "backoff" .Values.release.backoffLimit "resources" .Values.release.resources "chartVersion" .Chart.Version | toJson | sha256sum | trunc 12) -}}
{{- end -}}

{{- define "quizmon.labels" -}}
app.kubernetes.io/name: quizmon
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
{{- end -}}

{{- define "quizmon.containerSecurity" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: [ALL]
{{- end -}}
