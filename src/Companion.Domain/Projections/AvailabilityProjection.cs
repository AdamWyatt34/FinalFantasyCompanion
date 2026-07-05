using Companion.Domain.Model;
using Companion.Domain.State;

namespace Companion.Domain.Projections;

public enum AvailabilityStatus
{
    Collected,
    Missed,
    NotYet,
    Blocked,
    LastChance,
    ClosingSoon,
    Available,
}

public sealed record AvailabilityEntry(
    PackItem Item,
    AvailabilityStatus Status,
    IReadOnlyList<string> MissingPrereqs);

public sealed record AvailabilityView(int Position, IReadOnlyList<AvailabilityEntry> Items);

public static class AvailabilityProjection
{
    public const int Lookahead = 2;

    public static AvailabilityView Project(Pack pack, PlaythroughState state) =>
        new(state.Position, [.. pack.Items.Select(item => Classify(item, state))]);

    /// <summary>Rule chain, first match wins — order is the contract.</summary>
    public static AvailabilityEntry Classify(PackItem item, PlaythroughState state)
    {
        var p = state.Position;
        var (opensAt, closesAt) = item.Window;

        if (state.Collected.Contains(item.Id))
        {
            return new(item, AvailabilityStatus.Collected, []);
        }

        if (closesAt is { } closed && p > closed)
        {
            return new(item, AvailabilityStatus.Missed, []);
        }

        if (p < opensAt)
        {
            return new(item, AvailabilityStatus.NotYet, []);
        }

        var missing = item.Prereqs.Where(pr => !state.Collected.Contains(pr)).ToList();
        if (missing.Count > 0)
        {
            return new(item, AvailabilityStatus.Blocked, missing);
        }

        if (closesAt == p)
        {
            return new(item, AvailabilityStatus.LastChance, []);
        }

        if (closesAt is { } closing && closing - p <= Lookahead)
        {
            return new(item, AvailabilityStatus.ClosingSoon, []);
        }

        return new(item, AvailabilityStatus.Available, []);
    }
}
