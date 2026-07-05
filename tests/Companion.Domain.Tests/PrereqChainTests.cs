using Companion.Domain.Projections;
using Companion.Domain.State;
using Companion.Domain.Tests.Builders;
using Shouldly;

namespace Companion.Domain.Tests;

/// <summary>
/// The showcase scenario: Knights of the Round stays Blocked until every link
/// of the chocobo breeding chain is collected.
/// </summary>
public class PrereqChainTests
{
    private static readonly string[] Chain =
        ["highwind", "lure", "stables", "goodgreat", "racing", "bluegreen", "black", "gold"];

    private static Companion.Domain.Model.Pack BuildChainPack()
    {
        var builder = new PackBuilder().WithPositions(20);

        string? previous = null;
        foreach (var link in Chain)
        {
            var dependsOn = previous;
            builder.WithItem(link, i =>
            {
                i.Window(13, null);
                return dependsOn is null ? i : i.Needs(dependsOn);
            });
            previous = link;
        }

        return builder
            .WithItem("kotr", i => i.Window(13, null).Needs("gold"))
            .Build();
    }

    [Fact]
    public void KotR_IsBlocked_UntilEveryBreedingLinkIsCollected()
    {
        var pack = BuildChainPack();
        var kotr = pack.Items.Single(i => i.Id == "kotr");
        var collected = new HashSet<string>();

        foreach (var link in Chain)
        {
            AvailabilityProjection.Classify(kotr, new PlaythroughState(13, collected))
                .Status.ShouldBe(AvailabilityStatus.Blocked, $"KotR should stay Blocked before '{link}' is collected");
            collected.Add(link);
        }

        AvailabilityProjection.Classify(kotr, new PlaythroughState(13, collected))
            .Status.ShouldBe(AvailabilityStatus.Available);
    }

    [Fact]
    public void KotR_ReportsGoldChocobo_AsTheMissingLink()
    {
        var pack = BuildChainPack();
        var kotr = pack.Items.Single(i => i.Id == "kotr");
        var allButGold = new HashSet<string>(Chain[..^1]);

        var entry = AvailabilityProjection.Classify(kotr, new PlaythroughState(13, allButGold));

        entry.Status.ShouldBe(AvailabilityStatus.Blocked);
        entry.MissingPrereqs.ShouldBe(["gold"]);
    }

    [Fact]
    public void EachChainLink_IsBlockedByItsDirectPredecessorOnly()
    {
        var pack = BuildChainPack();
        var black = pack.Items.Single(i => i.Id == "black");

        var entry = AvailabilityProjection.Classify(black, new PlaythroughState(13, new HashSet<string>()));

        entry.Status.ShouldBe(AvailabilityStatus.Blocked);
        entry.MissingPrereqs.ShouldBe(["bluegreen"]);
    }
}
