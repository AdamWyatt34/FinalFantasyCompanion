using Companion.Domain.Events;
using Companion.Domain.Model;

namespace Companion.Domain.State;

/// <summary>
/// Pure fold of the event log. PositionAdvanced and PositionCorrected apply identically —
/// the distinction is recorded intent, never behavior. Collect/uncollect are idempotent.
/// </summary>
public sealed record PlaythroughState(int Position, IReadOnlySet<string> Collected)
{
    public static PlaythroughState Initial(Pack pack) =>
        new(pack.Positions.Min(p => p.Order), new HashSet<string>());

    public static PlaythroughState Fold(Pack pack, IEnumerable<ProgressEvent> events) =>
        events.Aggregate(Initial(pack), (state, e) => state.Apply(e));

    public PlaythroughState Apply(ProgressEvent e) => e switch
    {
        PositionAdvanced a => this with { Position = a.To },
        PositionCorrected c => this with { Position = c.To },
        ItemCollected ic => this with { Collected = With(ic.ItemId) },
        ItemUncollected iu => this with { Collected = Without(iu.ItemId) },
        _ => this,
    };

    private HashSet<string> With(string itemId) => [.. Collected, itemId];

    private HashSet<string> Without(string itemId)
    {
        var next = new HashSet<string>(Collected);
        next.Remove(itemId);
        return next;
    }
}
