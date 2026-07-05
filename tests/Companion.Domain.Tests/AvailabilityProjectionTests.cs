using Companion.Domain.Model;
using Companion.Domain.Projections;
using Companion.Domain.State;
using Companion.Domain.Tests.Builders;
using Shouldly;

namespace Companion.Domain.Tests;

public class AvailabilityProjectionTests
{
    private static AvailabilityEntry ClassifyAt(int position, PackItem item, params string[] collected) =>
        AvailabilityProjection.Classify(item, new PlaythroughState(position, new HashSet<string>(collected)));

    [Fact]
    public void Rule1_CollectedItem_IsCollected()
    {
        var item = new ItemBuilder("x").Window(1, 3).Build();

        ClassifyAt(2, item, "x").Status.ShouldBe(AvailabilityStatus.Collected);
    }

    [Fact]
    public void Rule2_PositionPastClose_IsMissed()
    {
        var item = new ItemBuilder("x").Window(1, 3).Build();

        ClassifyAt(4, item).Status.ShouldBe(AvailabilityStatus.Missed);
    }

    [Fact]
    public void Rule3_PositionBeforeOpen_IsNotYet()
    {
        var item = new ItemBuilder("x").Window(5, null).Build();

        ClassifyAt(2, item).Status.ShouldBe(AvailabilityStatus.NotYet);
    }

    [Fact]
    public void Rule4_UncollectedPrereq_IsBlocked_ListingMissing()
    {
        var item = new ItemBuilder("x").Window(1, null).Needs("a", "b").Build();

        var entry = ClassifyAt(2, item, "a");

        entry.Status.ShouldBe(AvailabilityStatus.Blocked);
        entry.MissingPrereqs.ShouldBe(["b"]);
    }

    [Fact]
    public void Rule5_ClosesAtCurrentPosition_IsLastChance()
    {
        var item = new ItemBuilder("x").Window(1, 4).Build();

        ClassifyAt(4, item).Status.ShouldBe(AvailabilityStatus.LastChance);
    }

    [Fact]
    public void Rule6_ClosesWithinLookahead_IsClosingSoon()
    {
        var item = new ItemBuilder("x").Window(1, 6).Build();

        ClassifyAt(4, item).Status.ShouldBe(AvailabilityStatus.ClosingSoon);
    }

    [Fact]
    public void Rule7_OpenWithNoDeadlinePressure_IsAvailable()
    {
        var item = new ItemBuilder("x").Window(1, null).Build();

        ClassifyAt(4, item).Status.ShouldBe(AvailabilityStatus.Available);
    }

    [Fact]
    public void Precedence_CollectedBeatsMissed()
    {
        var item = new ItemBuilder("x").Window(1, 3).Build();

        ClassifyAt(9, item, "x").Status.ShouldBe(AvailabilityStatus.Collected);
    }

    [Fact]
    public void Precedence_BlockedBeatsLastChance()
    {
        var item = new ItemBuilder("x").Window(1, 4).Needs("key").Build();

        var entry = ClassifyAt(4, item);

        entry.Status.ShouldBe(AvailabilityStatus.Blocked);
        entry.MissingPrereqs.ShouldBe(["key"]);
    }

    [Fact]
    public void Boundary_ClosesAtMinusPositionOfThree_IsAvailableNotClosingSoon()
    {
        var item = new ItemBuilder("x").Window(1, 7).Build();

        ClassifyAt(4, item).Status.ShouldBe(AvailabilityStatus.Available);
    }

    [Fact]
    public void Project_EmitsOneEntryPerPackItem_AtCurrentPosition()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(1, null))
            .WithItem("b", i => i.Window(4, null))
            .Build();

        var view = AvailabilityProjection.Project(pack, new PlaythroughState(2, new HashSet<string>()));

        view.Position.ShouldBe(2);
        view.Items.Count.ShouldBe(2);
        view.Items.Select(e => e.Status).ShouldBe([AvailabilityStatus.Available, AvailabilityStatus.NotYet]);
    }
}
