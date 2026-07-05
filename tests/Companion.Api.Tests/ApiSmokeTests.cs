using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Companion.Api.Tests.TestHost;
using Shouldly;

namespace Companion.Api.Tests;

public sealed class ApiSmokeTests : IDisposable
{
    private readonly CompanionApiFactory _factory = new();
    private readonly HttpClient _client;

    public ApiSmokeTests()
    {
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<JsonNode> GetJson(string url)
    {
        var response = await _client.GetAsync(url);
        response.StatusCode.ShouldBe(HttpStatusCode.OK, url);
        return (await response.Content.ReadFromJsonAsync<JsonNode>())!;
    }

    private async Task<HttpResponseMessage> PostEvent(string type, int? to = null, string? itemId = null) =>
        await _client.PostAsJsonAsync("/api/games/test/events", new { type, to, itemId });

    [Fact]
    public async Task GetGames_ListsTheLoadedPack()
    {
        var games = await GetJson("/api/games");

        games.AsArray().Count.ShouldBe(1);
        games[0]!["id"]!.GetValue<string>().ShouldBe("test");
        games[0]!["title"]!.GetValue<string>().ShouldBe("Test Game");
    }

    [Fact]
    public async Task GetPack_ExposesThemeTokensAndItems()
    {
        var pack = await GetJson("/api/games/test/pack");

        pack["theme"]!["bg"]!.GetValue<string>().ShouldBe("#04061a");
        pack["positions"]!.AsArray().Count.ShouldBe(6);
        pack["items"]!.AsArray().Count.ShouldBe(4);
    }

    [Fact]
    public async Task Availability_AtFreshStart_IsPositionOne_WithFlyerNotYet()
    {
        var availability = await GetJson("/api/games/test/availability");

        availability["position"]!.GetValue<int>().ShouldBe(1);
        var flyer = availability["items"]!.AsArray()
            .Single(i => i!["item"]!["id"]!.GetValue<string>() == "flyer");
        flyer!["status"]!.GetValue<string>().ShouldBe("notYet");
    }

    [Fact]
    public async Task CollectingAnItem_FlipsItToCollected()
    {
        (await PostEvent("positionAdvanced", to: 2)).StatusCode.ShouldBe(HttpStatusCode.OK);
        var response = await PostEvent("itemCollected", itemId: "flyer");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var snapshot = (await response.Content.ReadFromJsonAsync<JsonNode>())!;
        snapshot["position"]!.GetValue<int>().ShouldBe(2);
        snapshot["collected"]!.AsArray().Select(n => n!.GetValue<string>()).ShouldBe(["flyer"]);

        var availability = await GetJson("/api/games/test/availability");
        var flyer = availability["items"]!.AsArray()
            .Single(i => i!["item"]!["id"]!.GetValue<string>() == "flyer");
        flyer!["status"]!.GetValue<string>().ShouldBe("collected");
    }

    [Fact]
    public async Task AdvancingPastAClose_MarksTheItemMissed()
    {
        (await PostEvent("positionAdvanced", to: 4)).StatusCode.ShouldBe(HttpStatusCode.OK);

        var availability = await GetJson("/api/games/test/availability");
        var flyer = availability["items"]!.AsArray()
            .Single(i => i!["item"]!["id"]!.GetValue<string>() == "flyer");
        flyer!["status"]!.GetValue<string>().ShouldBe("missed");
    }

    [Fact]
    public async Task AdvanceImpact_ListsWindowsClosingInsideTheJump()
    {
        var impact = await GetJson("/api/games/test/advance-impact?to=4");

        impact["from"]!.GetValue<int>().ShouldBe(1);
        impact["to"]!.GetValue<int>().ShouldBe(4);
        impact["closing"]!.AsArray()
            .Select(i => i!["item"]!["id"]!.GetValue<string>())
            .ShouldBe(["flyer"]);
    }

    [Fact]
    public async Task Route_AtRoutedBeat_BucketsAndBlocksCorrectly()
    {
        (await PostEvent("positionAdvanced", to: 4)).StatusCode.ShouldBe(HttpStatusCode.OK);

        var route = await GetJson("/api/games/test/route");

        var now = route["now"]!.AsArray();
        now.Select(e => e!["item"]!["id"]!.GetValue<string>()).ShouldBe(["mythril", "gospel"]);
        now[1]!["status"]!.GetValue<string>().ShouldBe("blocked");
        now[1]!["missingPrereqs"]!.AsArray().Single()!.GetValue<string>().ShouldBe("mythril");
        now[0]!["item"]!["route"]!["why"]!.GetValue<string>().ShouldBe("Trade for the limit");

        var later = route["later"]!.AsArray();
        var beta = later.Single(e => e!["item"]!["id"]!.GetValue<string>() == "beta");
        beta!["masked"]!.GetValue<bool>().ShouldBeTrue();
    }

    [Fact]
    public async Task Reset_ArchivesAndStartsFresh()
    {
        (await PostEvent("positionAdvanced", to: 3)).StatusCode.ShouldBe(HttpStatusCode.OK);

        var response = await _client.PostAsync("/api/games/test/reset", content: null);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var reset = (await response.Content.ReadFromJsonAsync<JsonNode>())!;

        reset["position"]!.GetValue<int>().ShouldBe(1);
        reset["archivedTo"]!.GetValue<string>().ShouldEndWith(".archive.jsonl");
        File.Exists(Path.Combine(_factory.PlaythroughsDirectory, reset["archivedTo"]!.GetValue<string>()))
            .ShouldBeTrue();

        var availability = await GetJson("/api/games/test/availability");
        availability["position"]!.GetValue<int>().ShouldBe(1);
    }

    [Fact]
    public async Task ResetOnFreshPlaythrough_ReturnsNullArchive()
    {
        var response = await _client.PostAsync("/api/games/test/reset", content: null);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var reset = (await response.Content.ReadFromJsonAsync<JsonNode>())!;
        reset["archivedTo"].ShouldBeNull();
    }

    [Fact]
    public async Task UnknownGame_Returns404()
    {
        (await _client.GetAsync("/api/games/nope/availability"))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UnknownItemId_Returns400()
    {
        (await PostEvent("itemCollected", itemId: "ghost"))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UnknownPositionOrder_Returns400()
    {
        (await PostEvent("positionAdvanced", to: 99))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UnknownEventType_Returns400()
    {
        (await PostEvent("teleported", to: 2))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AdvanceImpactToUnknownOrder_Returns400()
    {
        (await _client.GetAsync("/api/games/test/advance-impact?to=99"))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }
}
