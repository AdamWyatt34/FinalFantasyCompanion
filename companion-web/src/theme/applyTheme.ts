const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Exposes every pack theme token as a --ff-* CSS variable on :root. */
export function applyTheme(tokens: Record<string, string>) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(tokens)) {
    root.style.setProperty(`--ff-${kebab(name)}`, value);
  }
}
