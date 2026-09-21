export const downloadBlob = (filename: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadJson = (filename: string, value: unknown): void =>
  downloadBlob(
    filename,
    new Blob([JSON.stringify(value)], { type: 'application/json' }),
  );
