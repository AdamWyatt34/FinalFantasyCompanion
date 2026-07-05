namespace Companion.Domain.Model;

public sealed record Pack(
    GameInfo Game,
    ThemeTokens Theme,
    IReadOnlyList<StoryPosition> Positions,
    IReadOnlyList<PackItem> Items);

public sealed record GameInfo(string Id, string Title);

public sealed record StoryPosition(string Id, int Order, string Label, int Disc);
