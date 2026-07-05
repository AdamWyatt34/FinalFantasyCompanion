using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Companion.Api.Tests.TestHost;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Shouldly;

namespace Companion.Api.Tests;

/// <summary>
/// The README demo script, end to end against the real ff7.json:
/// advance out of Midgar → warning fires → jump to Disc 2 → the route shows the
/// chocobo chain with KotR Blocked → collect the chain → KotR Available.
/// </summary>
public sealed class DemoScriptTests : IDisposable
{
    private sealed class RealPackFactory : WebApplicationFactory<Program>
    {
        public string PlaythroughsDirectory { get; } = Path.Combine(
            Path.GetTempPath(), "ffcompanion-demo", Guid.NewGuid().ToString("N"));

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("Companion:PackDirectory", RepoPaths.PackDirectory);
            builder.UseSetting("Companion:PlaythroughDirectory", PlaythroughsDirectory);
        }
    }

    private readonly RealPackFactory _factory = new();
    private readonly HttpClient _client;

    public DemoScriptTests()
    {
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        if (Directory.Exists(_factory.PlaythroughsDirectory))
        {
            Directory.Delete(_factory.PlaythroughsDirectory, recursive: true);
        }
    }

    private async Task Post(string type, int? to = null, string? itemId = null)
    {
        var response = await _client.PostAsJsonAsync("/api/games/ff7/events", new { type, to, itemId });
        response.StatusCode.ShouldBe(HttpStatusCode.OK, $"{type} to={to} itemId={itemId}");
    }

    private async Task<JsonNode> GetJson(string url)
    {
        var response = await _client.GetAsync(url);
        response.StatusCode.ShouldBe(HttpStatusCode.OK, url);
        return (await response.Content.ReadFromJsonAsync<JsonNode>())!;
    }

    [Fact]
    public async Task TheDemoScript_PlaysThroughEndToEnd()
    {
        // Play through Midgar to Shinra HQ.
        await Post("positionAdvanced", to: 2);
        await Post("positionAdvanced", to: 3);

        // Advancing out of Midgar fires the point-of-no-return warning for the tower missables.
        var impact = await GetJson("/api/games/ff7/advance-impact?to=4");
        impact["closing"]!.AsArray()
            .Select(i => i!["item"]!["id"]!.GetValue<string>())
            .ShouldBe(["flyer1", "enemyskill1", "elemental"], ignoreOrder: true);

        // Jump straight to the Disc 2 Highwind beat.
        await Post("positionAdvanced", to: 15);

        // The route's Now bucket shows the curated chocobo chain, KotR Blocked at the end.
        var route = await GetJson("/api/games/ff7/route");
        var now = route["now"]!.AsArray();
        var nowIds = now.Select(e => e!["item"]!["id"]!.GetValue<string>()).ToList();
        string[] chain =
            ["highwind", "chocobolure", "stables", "carobnuts", "goodchocobo", "greatchocobo",
             "racing1", "bluechocobo", "greenchocobo", "racing2", "blackchocobo", "racing3",
             "zeionut", "goldchocobo", "kotr"];
        nowIds.ShouldBeSubsetOf(chain.Concat(["beta", "mime", "condor1", "mythril", "greatgospel", "yuffie", "vincent", "odin", "titan", "pagoda", "aerithlimits"]));
        chain.ShouldBeSubsetOf(nowIds);

        var kotr = now.Single(e => e!["item"]!["id"]!.GetValue<string>() == "kotr");
        kotr!["status"]!.GetValue<string>().ShouldBe("blocked");
        kotr["missingPrereqs"]!.AsArray().Single()!.GetValue<string>().ShouldBe("goldchocobo");
        kotr["item"]!["route"]!["why"]!.GetValue<string>().ShouldBe("The whole point of the gold bird");

        // Collect the chain in route order.
        foreach (var id in chain.Where(id => id != "kotr"))
        {
            await Post("itemCollected", itemId: id);
        }

        // KotR flips to Available.
        var after = await GetJson("/api/games/ff7/route");
        var kotrAfter = after["now"]!.AsArray()
            .Single(e => e!["item"]!["id"]!.GetValue<string>() == "kotr");
        kotrAfter!["status"]!.GetValue<string>().ShouldBe("available");
    }

    [Fact]
    public async Task Disc2Spoilers_AreMaskedWhileStillInMidgar()
    {
        var route = await GetJson("/api/games/ff7/route");

        var later = route["later"]!.AsArray();
        var kotr = later.Single(e => e!["item"]!["id"]!.GetValue<string>() == "kotr");
        kotr!["masked"]!.GetValue<bool>().ShouldBeTrue();
    }
}
