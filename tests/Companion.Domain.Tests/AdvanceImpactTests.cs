using Companion.Domain.Events;
using Companion.Domain.Projections;
using Companion.Domain.State;
using Companion.Domain.Tests.Builders;
using Shouldly;

namespace Companion.Domain.Tests;

public class AdvanceImpactTests
{
    private static PlaythroughState At(int position, params string[] collected) =>
        new(position, new HashSet<string>(collected));

    [Fact]
    public void WindowClosingBeforeTarget_IsIncluded()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, 4))
            .Build();

        var impact = AdvanceImpactCalculator.Compute(pack, At(3), target: 5);

        impact.Closing.ShouldHaveSingleItem().Item.Id.ShouldBe("x");
    }

    [Fact]
    public void WindowSkippedEntirelyByJump_IsIncluded()
    {
        var pack = new PackBuilder()
            .WithPositions(20)
            .WithItem("inside", i => i.Window(7, 9))
            .Build();

        var impact = AdvanceImpactCalculator.Compute(pack, At(3), target: 15);

        impact.Closing.ShouldHaveSingleItem().Item.Id.ShouldBe("inside");
    }

    [Fact]
    public void WindowClosingExactlyAtTarget_IsExcluded()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, 5))
            .Build();

        var impact = AdvanceImpactCalculator.Compute(pack, At(3), target: 5);

        impact.Closing.ShouldBeEmpty();
    }

    [Fact]
    public void LastChanceAtCurrentPosition_IsIncluded()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, 3))
            .Build();

        var impact = AdvanceImpactCalculator.Compute(pack, At(3), target: 4);

        impact.Closing.ShouldHaveSingleItem().Item.Id.ShouldBe("x");
    }

    [Fact]
    public void CollectedItem_IsExcluded()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, 4))
            .Build();

        var impact = AdvanceImpactCalculator.Compute(pack, At(3, "x"), target: 6);

        impact.Closing.ShouldBeEmpty();
    }

    [Fact]
    public void AlreadyMissedItem_IsExcluded()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, 2))
            .Build();

        var impact = AdvanceImpactCalculator.Compute(pack, At(4), target: 8);

        impact.Closing.ShouldBeEmpty();
    }

    [Fact]
    public void BlockedItem_IsIncluded_WithItsMissingPrereqs()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, 4).Needs("key"))
            .Build();

        var impact = AdvanceImpactCalculator.Compute(pack, At(3), target: 6);

        var entry = impact.Closing.ShouldHaveSingleItem();
        entry.Status.ShouldBe(AvailabilityStatus.Blocked);
        entry.MissingPrereqs.ShouldBe(["key"]);
    }

    [Fact]
    public void BackwardCorrection_UnMissesItem_AndItReappearsInImpact()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, 3))
            .Build();

        var missed = PlaythroughState.Fold(pack, [EventFactory.Advanced(6)]);
        AvailabilityProjection.Classify(pack.Items[0], missed)
            .Status.ShouldBe(AvailabilityStatus.Missed);

        var corrected = missed.Apply(EventFactory.Corrected(2));
        AvailabilityProjection.Classify(pack.Items[0], corrected)
            .Status.ShouldBe(AvailabilityStatus.ClosingSoon);

        AdvanceImpactCalculator.Compute(pack, corrected, target: 6)
            .Closing.ShouldHaveSingleItem().Item.Id.ShouldBe("x");
    }
}
