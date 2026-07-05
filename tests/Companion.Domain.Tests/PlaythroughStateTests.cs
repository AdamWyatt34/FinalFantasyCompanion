using Companion.Domain.State;
using Companion.Domain.Tests.Builders;
using Shouldly;

namespace Companion.Domain.Tests;

public class PlaythroughStateTests
{
    private static readonly Companion.Domain.Model.Pack Pack =
        new PackBuilder().WithPositions(10).Build();

    [Fact]
    public void EmptyLog_StartsAtLowestPositionOrder_WithNothingCollected()
    {
        var state = PlaythroughState.Fold(Pack, []);

        state.Position.ShouldBe(1);
        state.Collected.ShouldBeEmpty();
    }

    [Fact]
    public void PositionAdvanced_MovesPosition()
    {
        var state = PlaythroughState.Fold(Pack, [EventFactory.Advanced(4)]);

        state.Position.ShouldBe(4);
    }

    [Fact]
    public void AdvancedAndCorrected_FoldIdentically()
    {
        var viaAdvance = PlaythroughState.Fold(Pack, [EventFactory.Advanced(7)]);
        var viaCorrection = PlaythroughState.Fold(Pack, [EventFactory.Corrected(7)]);

        viaCorrection.Position.ShouldBe(viaAdvance.Position);
    }

    [Fact]
    public void Corrected_MovesBackward()
    {
        var state = PlaythroughState.Fold(Pack, [EventFactory.Advanced(6), EventFactory.Corrected(2)]);

        state.Position.ShouldBe(2);
    }

    [Fact]
    public void ItemCollected_AddsToCollectedSet()
    {
        var state = PlaythroughState.Fold(Pack, [EventFactory.Collected("beta")]);

        state.Collected.ShouldBe(["beta"]);
    }

    [Fact]
    public void DuplicateCollect_IsIdempotent()
    {
        var state = PlaythroughState.Fold(Pack, [EventFactory.Collected("beta"), EventFactory.Collected("beta")]);

        state.Collected.Count.ShouldBe(1);
    }

    [Fact]
    public void Uncollect_RemovesItem()
    {
        var state = PlaythroughState.Fold(
            Pack,
            [EventFactory.Collected("beta"), EventFactory.Uncollected("beta")]);

        state.Collected.ShouldBeEmpty();
    }

    [Fact]
    public void UncollectOfNeverCollectedItem_IsNoOp()
    {
        var state = PlaythroughState.Fold(Pack, [EventFactory.Uncollected("ghost")]);

        state.Collected.ShouldBeEmpty();
    }

    [Fact]
    public void Apply_DoesNotMutatePriorState()
    {
        var before = PlaythroughState.Fold(Pack, [EventFactory.Collected("beta")]);

        _ = before.Apply(EventFactory.Collected("gamma"));

        before.Collected.ShouldBe(["beta"]);
    }
}
