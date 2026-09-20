{{- define "quizmon.name" -}}
{{- printf "%s-quizmon" .Release.Name | trunc 40 | trimSuffix "-" -}}
{{- end -}}

{{- define "quizmon.image" -}}
{{- printf "%s@%s" .Values.releaseImage.repository .Values.releaseImage.digest -}}
{{- end -}}

{{- define "quizmon.configName" -}}
{{- printf "%s-config-%s" (include "quizmon.name" .) ((include "quizmon.operation" .) | sha256sum | trunc 12) -}}
{{- end -}}

{{- define "quizmon.releaseName" -}}
{{- printf "%s-release-%s" (include "quizmon.name" .) (dict "values" .Values "chartVersion" .Chart.Version | toJson | sha256sum | trunc 12) -}}
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

{{- define "quizmon.selectionName" -}}
{{- printf "%s-selection" (include "quizmon.name" .) -}}
{{- end -}}

{{- define "quizmon.operation" -}}
{{- $hash := dict "values" .Values "chartVersion" .Chart.Version "namespace" .Release.Namespace "release" .Release.Name | toJson | sha256sum -}}
{{- $id := printf "%s-%s-%s-%s-%s" (substr 0 8 $hash) (substr 8 12 $hash) (substr 12 16 $hash) (substr 16 20 $hash) (substr 20 32 $hash) -}}
{{- dict "version" 1 "id" $id "artifact" .Values.releaseImage.digest "configuration" (printf "sha256:%s" $hash) | toJson -}}
{{- end -}}
