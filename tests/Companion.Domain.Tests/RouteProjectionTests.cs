using Companion.Domain.Projections;
using Companion.Domain.State;
using Companion.Domain.Tests.Builders;
using Shouldly;

namespace Companion.Domain.Tests;

public class RouteProjectionTests
{
    private static PlaythroughState At(int position, params string[] collected) =>
        new(position, new HashSet<string>(collected));

    [Fact]
    public void RoutedAtCurrentPosition_LandsInNow()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, null).Routed(at: 5))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        view.Now.ShouldHaveSingleItem().Item.Id.ShouldBe("x");
    }

    [Fact]
    public void CatchUp_RoutedBehindPosition_StillOpen_LandsInNow()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, null).Routed(at: 3))
            .Build();

        var view = RouteProjection.Project(pack, At(7));

        view.Now.ShouldHaveSingleItem().Item.Id.ShouldBe("x");
    }

    [Fact]
    public void UnroutedLastChance_LandsInNow_UrgencyOutranksCuration()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("closing", i => i.Window(1, 5))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        var entry = view.Now.ShouldHaveSingleItem();
        entry.Item.Id.ShouldBe("closing");
        entry.Status.ShouldBe(AvailabilityStatus.LastChance);
    }

    [Fact]
    public void NowSort_LastChanceFirst_ThenRouteRank()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("routed2", i => i.Named("B").Window(1, null).Routed(at: 5, rank: 2))
            .WithItem("routed1", i => i.Named("A").Window(1, null).Routed(at: 5, rank: 1))
            .WithItem("urgent", i => i.Named("Z").Window(1, 5))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        view.Now.Select(e => e.Item.Id).ShouldBe(["urgent", "routed1", "routed2"]);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    public void RoutedWithinLookahead_LandsInNext(int distance)
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, null).Routed(at: 5 + distance))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        view.Next.ShouldHaveSingleItem().Item.Id.ShouldBe("x");
    }

    [Fact]
    public void RoutedThreeAhead_LandsInLater()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, null).Routed(at: 8))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        view.Next.ShouldBeEmpty();
        view.Later.ShouldHaveSingleItem().Item.Id.ShouldBe("x");
    }

    [Fact]
    public void UnroutedOpenItem_LandsInLater_RouteViewIsComplete()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("yuffie", i => i.Window(1, null))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        view.Later.ShouldHaveSingleItem().Item.Id.ShouldBe("yuffie");
    }

    [Fact]
    public void NotYetOpen_IsMaskedInLater()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("spoiler", i => i.Window(8, null))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        var entry = view.Later.ShouldHaveSingleItem();
        entry.Masked.ShouldBeTrue();
        entry.Status.ShouldBe(AvailabilityStatus.NotYet);
    }

    [Fact]
    public void OpenItems_AreNotMasked()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("x", i => i.Window(1, null).Routed(at: 5))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        view.Now.ShouldHaveSingleItem().Masked.ShouldBeFalse();
    }

    [Fact]
    public void CollectedAndMissedItems_AppearNowhere()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("done", i => i.Window(1, null).Routed(at: 5))
            .WithItem("gone", i => i.Window(1, 2).Routed(at: 1))
            .Build();

        var view = RouteProjection.Project(pack, At(5, "done"));

        view.Now.ShouldBeEmpty();
        view.Next.ShouldBeEmpty();
        view.Later.ShouldBeEmpty();
    }

    [Fact]
    public void BlockedItem_KeepsMissingPrereqsInRouteEntry()
    {
        var pack = new PackBuilder()
            .WithPositions(10)
            .WithItem("kotr", i => i.Window(1, null).Needs("gold").Routed(at: 5))
            .Build();

        var view = RouteProjection.Project(pack, At(5));

        var entry = view.Now.ShouldHaveSingleItem();
        entry.Status.ShouldBe(AvailabilityStatus.Blocked);
        entry.MissingPrereqs.ShouldBe(["gold"]);
    }
}
