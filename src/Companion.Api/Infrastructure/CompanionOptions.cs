namespace Companion.Api.Infrastructure;

public sealed class CompanionOptions
{
    public const string SectionName = "Companion";

    public string PackDirectory { get; set; } = Path.Combine("data", "packs");

    public string PlaythroughDirectory { get; set; } = Path.Combine("data", "playthroughs");
}
