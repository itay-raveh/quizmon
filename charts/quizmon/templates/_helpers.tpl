{{- define "quizmon.name" -}}
{{- printf "%s-quizmon" .Release.Name | trunc 40 | trimSuffix "-" -}}
{{- end -}}

{{- define "quizmon.image" -}}
{{- printf "%s@%s" .Values.releaseImage.repository .Values.releaseImage.digest -}}
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
