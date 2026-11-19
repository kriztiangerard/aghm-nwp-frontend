export function safeFileName(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "network-plan"
  );
}
