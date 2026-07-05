using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Companion.Api.Tests.TestHost;

public class CompanionApiFactory : WebApplicationFactory<Program>
{
    private readonly string _root = Path.Combine(
        Path.GetTempPath(), "ffcompanion-api-tests", Guid.NewGuid().ToString("N"));

    public CompanionApiFactory()
        : this(TestPack.Json)
    {
    }

    public CompanionApiFactory(string packJson)
    {
        Directory.CreateDirectory(PacksDirectory);
        File.WriteAllText(Path.Combine(PacksDirectory, "test.json"), packJson);
    }

    public string PacksDirectory => Path.Combine(_root, "packs");

    public string PlaythroughsDirectory => Path.Combine(_root, "playthroughs");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Companion:PackDirectory", PacksDirectory);
        builder.UseSetting("Companion:PlaythroughDirectory", PlaythroughsDirectory);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try
        {
            if (Directory.Exists(_root))
            {
                Directory.Delete(_root, recursive: true);
            }
        }
        catch (IOException)
        {
            // Temp dir cleanup is best-effort on Windows.
        }
    }
}

public static class TestPack
{
    /// <summary>A miniature FF7-shaped pack: a Midgar-style missable, a prereq pair with route data, and a permanent item.</summary>
    public const string Json =
        """
        {
          "game": { "id": "test", "title": "Test Game" },
          "theme": { "tokens": { "bg": "#04061a" } },
          "positions": [
            { "id": "p1", "order": 1, "label": "Start", "disc": 1 },
            { "id": "p2", "order": 2, "label": "Slums", "disc": 1 },
            { "id": "p3", "order": 3, "label": "Tower", "disc": 1 },
            { "id": "p4", "order": 4, "label": "World", "disc": 1 },
            { "id": "p5", "order": 5, "label": "Coast", "disc": 1 },
            { "id": "p6", "order": 6, "label": "Canyon", "disc": 1 }
          ],
          "items": [
            {
              "id": "flyer", "name": "Flyer", "type": "quest", "location": "Slums kid's house",
              "window": { "opensAt": 2, "closesAt": 3 },
              "prereqs": [], "notes": "Missable.", "verified": false
            },
            {
              "id": "mythril", "name": "Mythril", "type": "key", "location": "Sleeping cave",
              "window": { "opensAt": 4, "closesAt": 5 },
              "prereqs": [], "notes": "", "verified": false,
              "route": { "at": 4, "rank": 1, "why": "Trade for the limit" }
            },
            {
              "id": "gospel", "name": "Great Gospel", "type": "limit", "location": "Weapon seller",
              "window": { "opensAt": 4, "closesAt": 5 },
              "prereqs": ["mythril"], "notes": "", "verified": false,
              "route": { "at": 4, "rank": 2, "why": "Final limit break" }
            },
            {
              "id": "beta", "name": "Beta", "type": "materia", "location": "Marshes",
              "window": { "opensAt": 5 },
              "prereqs": [], "notes": "Never closes.", "verified": false
            }
          ]
        }
        """;
}
