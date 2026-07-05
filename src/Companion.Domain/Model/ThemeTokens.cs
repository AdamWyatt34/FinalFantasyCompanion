namespace Companion.Domain.Model;

/// <summary>
/// Chrome-only theme tokens (colors, gradients, borders) as an opaque name → CSS value map.
/// Functional status colors are app constants and never live here.
/// </summary>
public sealed record ThemeTokens(IReadOnlyDictionary<string, string> Tokens);
