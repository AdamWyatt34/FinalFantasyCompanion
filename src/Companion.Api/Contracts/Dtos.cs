using Companion.Domain.Model;
using Companion.Domain.Projections;

namespace Companion.Api.Contracts;

public sealed record GameSummaryDto(string Id, string Title);

public sealed record PositionDto(string Id, int Order, string Label, int Disc);

public sealed record RouteInfoDto(int At, int Rank, string Why);

public sealed record ItemDto(
    string Id,
    string Name,
    ItemType Type,
    string Location,
    int OpensAt,
    int? ClosesAt,
    IReadOnlyList<string> Prereqs,
    string Notes,
    bool Verified,
    RouteInfoDto? Route);

public sealed record PackDto(
    GameSummaryDto Game,
    IReadOnlyDictionary<string, string> Theme,
    IReadOnlyList<PositionDto> Positions,
    IReadOnlyList<ItemDto> Items);

public sealed record AvailabilityEntryDto(
    ItemDto Item,
    AvailabilityStatus Status,
    IReadOnlyList<string> MissingPrereqs);

public sealed record AvailabilityDto(int Position, IReadOnlyList<AvailabilityEntryDto> Items);

public sealed record RouteEntryDto(
    ItemDto Item,
    AvailabilityStatus Status,
    bool Masked,
    IReadOnlyList<string> MissingPrereqs);

public sealed record RouteDto(
    int Position,
    IReadOnlyList<RouteEntryDto> Now,
    IReadOnlyList<RouteEntryDto> Next,
    IReadOnlyList<RouteEntryDto> Later);

public sealed record AdvanceImpactDto(int From, int To, IReadOnlyList<AvailabilityEntryDto> Closing);

public sealed record StateSnapshotDto(int Position, IReadOnlyList<string> Collected);

public sealed record ResetResultDto(int Position, IReadOnlyList<string> Collected, string? ArchivedTo);

/// <summary>Request body for POST /events — one event per request; the server stamps OccurredAt.</summary>
public sealed record ProgressEventRequest(string Type, int? To = null, string? ItemId = null);

public static class DtoMapper
{
    public static ItemDto ToDto(this PackItem item) => new(
        item.Id,
        item.Name,
        item.Type,
        item.Location,
        item.Window.OpensAt,
        item.Window.ClosesAt,
        item.Prereqs,
        item.Notes,
        item.Verified,
        item.Route is { } r ? new RouteInfoDto(r.At, r.Rank, r.Why) : null);

    public static PackDto ToDto(this Pack pack) => new(
        new GameSummaryDto(pack.Game.Id, pack.Game.Title),
        pack.Theme.Tokens,
        [.. pack.Positions.Select(p => new PositionDto(p.Id, p.Order, p.Label, p.Disc))],
        [.. pack.Items.Select(ToDto)]);

    public static AvailabilityEntryDto ToDto(this AvailabilityEntry entry) =>
        new(entry.Item.ToDto(), entry.Status, entry.MissingPrereqs);

    public static AvailabilityDto ToDto(this AvailabilityView view) =>
        new(view.Position, [.. view.Items.Select(ToDto)]);

    public static RouteEntryDto ToDto(this RouteEntry entry) =>
        new(entry.Item.ToDto(), entry.Status, entry.Masked, entry.MissingPrereqs);

    public static RouteDto ToDto(this RouteView view) => new(
        view.Position,
        [.. view.Now.Select(ToDto)],
        [.. view.Next.Select(ToDto)],
        [.. view.Later.Select(ToDto)]);

    public static AdvanceImpactDto ToDto(this AdvanceImpactResult result) =>
        new(result.From, result.To, [.. result.Closing.Select(ToDto)]);
}
