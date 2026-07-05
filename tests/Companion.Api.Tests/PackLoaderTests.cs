using Companion.Api.Infrastructure;
using Companion.Api.Tests.TestHost;
using Companion.Domain.Validation;
using Shouldly;

namespace Companion.Api.Tests;

public class PackLoaderTests
{
    [Fact]
    public void TheShippedFf7Pack_LoadsAndValidates()
    {
        var packs = PackLoader.LoadAll(RepoPaths.PackDirectory);

        var ff7 = packs.Single(p => p.Game.Id == "ff7");
        ff7.Game.Title.ShouldBe("Final Fantasy VII");
        ff7.Positions.Count.ShouldBeInRange(20, 24);
        ff7.Items.Count.ShouldBeInRange(70, 100);
        ff7.Positions.Select(p => p.Disc).Distinct().Order().ShouldBe([1, 2, 3]);
        ff7.Items.ShouldAllBe(i => !i.Verified, "pack data is scaffolding until verified during play");
        ff7.Items.Single(i => i.Id == "kotr").Prereqs.ShouldBe(["goldchocobo"]);
        ff7.Theme.Tokens.ShouldContainKey("gold");
    }

    [Fact]
    public void TheShippedFf9Pack_LoadsAndValidates()
    {
        var packs = PackLoader.LoadAll(RepoPaths.PackDirectory);

        var ff9 = packs.Single(p => p.Game.Id == "ff9");
        ff9.Game.Title.ShouldBe("Final Fantasy IX");
        ff9.Positions.Count.ShouldBeInRange(20, 24);
        ff9.Items.Count.ShouldBeInRange(50, 80);
        ff9.Positions.Select(p => p.Disc).Distinct().Order().ShouldBe([1, 2, 3, 4]);
        ff9.Items.ShouldAllBe(i => !i.Verified, "pack data is scaffolding until verified during play");
        ff9.Items.Single(i => i.Id == "ozma").Prereqs.ShouldBe(["airgarden"]);
    }

    [Fact]
    public void AllPacks_DefineTheSameThemeTokenNames()
    {
        // The frontend binds chrome to --ff-* variables by token name; every pack must
        // supply the full set or a game switch would leave stale colors behind.
        var packs = PackLoader.LoadAll(RepoPaths.PackDirectory);

        packs.Count.ShouldBeGreaterThanOrEqualTo(2);
        var reference = packs[0].Theme.Tokens.Keys.Order().ToList();
        foreach (var pack in packs.Skip(1))
        {
            pack.Theme.Tokens.Keys.Order().ToList()
                .ShouldBe(reference, $"theme token names in '{pack.Game.Id}' must match '{packs[0].Game.Id}'");
        }
    }

    [Fact]
    public void MissingPackDirectory_Throws()
    {
        Should.Throw<DirectoryNotFoundException>(() =>
            PackLoader.LoadAll(Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"))));
    }

    [Fact]
    public void StructurallyBrokenPack_FailsFast_ListingEveryError()
    {
        var dir = Path.Combine(Path.GetTempPath(), "ffcompanion-broken", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            File.WriteAllText(Path.Combine(dir, "broken.json"),
                """
                {
                  "game": { "id": "broken", "title": "Broken" },
                  "theme": { "tokens": {} },
                  "positions": [ { "id": "p1", "order": 1, "label": "Start", "disc": 1 } ],
                  "items": [
                    {
                      "id": "a", "name": "A", "type": "quest", "location": "",
                      "window": { "opensAt": 9 },
                      "prereqs": ["ghost"], "notes": "", "verified": false
                    }
                  ]
                }
                """);

            var ex = Should.Throw<PackValidationException>(() => PackLoader.LoadAll(dir));

            ex.Errors.Count.ShouldBe(2);
            ex.Message.ShouldContain("unknown prereq 'ghost'");
            ex.Message.ShouldContain("opensAt 9");
        }
        finally
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    [Fact]
    public void MalformedJson_FailsFast_NamingTheFile()
    {
        var dir = Path.Combine(Path.GetTempPath(), "ffcompanion-badjson", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            File.WriteAllText(Path.Combine(dir, "bad.json"), "{ not json");

            var ex = Should.Throw<InvalidDataException>(() => PackLoader.LoadAll(dir));

            ex.Message.ShouldContain("bad.json");
        }
        finally
        {
            Directory.Delete(dir, recursive: true);
        }
    }
}
