using Companion.Domain.Model;
using Companion.Domain.State;

namespace Companion.Domain.Projections;

public sealed record AdvanceImpactResult(int From, int To, IReadOnlyList<AvailabilityEntry> Closing);

/// <summary>
/// Uncollected items whose window closes strictly before the target position — including
/// windows that open AND close entirely inside the jump. Already-missed items are excluded.
/// </summary>
public static class AdvanceImpactCalculator
{
    public static AdvanceImpactResult Compute(Pack pack, PlaythroughState state, int target)
    {
        var p = state.Position;

        var closing = pack.Items
            .Where(i => !state.Collected.Contains(i.Id))
            .Where(i => i.Window.ClosesAt is { } closes && closes >= p && closes < target)
            .Select(i => AvailabilityProjection.Classify(i, state))
            .ToList();

        return new AdvanceImpactResult(p, target, closing);
    }
}
