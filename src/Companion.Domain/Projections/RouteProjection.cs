using Companion.Domain.Model;
using Companion.Domain.State;

namespace Companion.Domain.Projections;

public enum RouteBucket
{
    Now,
    Next,
    Later,
}

public sealed record RouteEntry(
    PackItem Item,
    AvailabilityStatus Status,
    RouteBucket Bucket,
    bool Masked,
    IReadOnlyList<string> MissingPrereqs);

public sealed record RouteView(
    int Position,
    IReadOnlyList<RouteEntry> Now,
    IReadOnlyList<RouteEntry> Next,
    IReadOnlyList<RouteEntry> Later);

/// <summary>
/// Buckets authored route data over uncollected, non-missed items. The engine sorts and
/// filters; it never computes routes. Urgency always outranks curation: every LastChance
/// item lands in Now even without route data.
/// </summary>
public static class RouteProjection
{
    private const int UnroutedRank = int.MaxValue;

    public static RouteView Project(Pack pack, PlaythroughState state)
    {
        var p = state.Position;

        var candidates = pack.Items
            .Select(item => AvailabilityProjection.Classify(item, state))
            .Where(e => e.Status is not (AvailabilityStatus.Collected or AvailabilityStatus.Missed))
            .ToList();

        var now = candidates
            .Where(e => InNow(e, p))
            .OrderBy(e => e.Status == AvailabilityStatus.LastChance ? 0 : 1)
            .ThenBy(e => e.Item.Route?.Rank ?? UnroutedRank)
            .ThenBy(e => e.Item.Name, StringComparer.Ordinal)
            .Select(e => ToEntry(e, RouteBucket.Now, p))
            .ToList();

        var next = candidates
            .Where(e => !InNow(e, p) && InNext(e, p))
            .OrderBy(e => e.Item.Route!.At)
            .ThenBy(e => e.Item.Route!.Rank)
            .ThenBy(e => e.Item.Name, StringComparer.Ordinal)
            .Select(e => ToEntry(e, RouteBucket.Next, p))
            .ToList();

        var later = candidates
            .Where(e => !InNow(e, p) && !InNext(e, p))
            .OrderBy(e => e.Item.Route?.At ?? e.Item.Window.OpensAt)
            .ThenBy(e => e.Item.Route?.Rank ?? UnroutedRank)
            .ThenBy(e => e.Item.Name, StringComparer.Ordinal)
            .Select(e => ToEntry(e, RouteBucket.Later, p))
            .ToList();

        return new RouteView(p, now, next, later);
    }

    private static bool InNow(AvailabilityEntry e, int p) =>
        e.Status == AvailabilityStatus.LastChance || e.Item.Route?.At <= p;

    private static bool InNext(AvailabilityEntry e, int p) =>
        e.Item.Route is { } r && r.At > p && r.At - p <= AvailabilityProjection.Lookahead;

    private static RouteEntry ToEntry(AvailabilityEntry e, RouteBucket bucket, int p) =>
        new(e.Item, e.Status, bucket, Masked: e.Item.Window.OpensAt > p, e.MissingPrereqs);
}
