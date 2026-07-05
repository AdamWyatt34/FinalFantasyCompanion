namespace Companion.Domain.Model;

public enum ItemType
{
    Materia,
    Limit,
    Character,
    Key,
    Quest,
    Summon,
    Chocobo,
}

public sealed record AvailabilityWindow(int OpensAt, int? ClosesAt);

public sealed record RouteInfo(int At, int Rank, string Why);

public sealed record PackItem(
    string Id,
    string Name,
    ItemType Type,
    string Location,
    AvailabilityWindow Window,
    IReadOnlyList<string> Prereqs,
    string Notes,
    bool Verified,
    RouteInfo? Route);
