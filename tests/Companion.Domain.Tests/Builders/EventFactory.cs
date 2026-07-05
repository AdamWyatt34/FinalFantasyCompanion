using Companion.Domain.Events;

namespace Companion.Domain.Tests.Builders;

public static class EventFactory
{
    public static readonly DateTimeOffset Timestamp = new(2026, 7, 5, 12, 0, 0, TimeSpan.Zero);

    public static PositionAdvanced Advanced(int to) => new(to, Timestamp);

    public static PositionCorrected Corrected(int to) => new(to, Timestamp);

    public static ItemCollected Collected(string itemId) => new(itemId, Timestamp);

    public static ItemUncollected Uncollected(string itemId) => new(itemId, Timestamp);
}
