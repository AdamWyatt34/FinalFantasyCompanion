using Companion.Domain.Model;
using Companion.Domain.Ports;
using Companion.Domain.State;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Features;

public static class Errors
{
    public static Error GameNotFound(string gameId) =>
        Error.NotFound("Game.NotFound", $"Unknown game '{gameId}'");

    public static Error UnknownItem(string itemId) =>
        Error.Validation("Event.UnknownItem", $"Unknown item id '{itemId}'");

    public static Error UnknownPosition(int order) =>
        Error.Validation("Event.UnknownPosition", $"No story position with order {order}");

    public static Error UnknownEventType(string type) =>
        Error.Validation("Event.UnknownType", $"Unknown event type '{type}'");

    public static Error MissingField(string type, string field) =>
        Error.Validation("Event.MissingField", $"Event type '{type}' requires '{field}'");
}

public static class Playthroughs
{
    public static async Task<PlaythroughState> LoadAsync(
        Pack pack, IProgressEventStore store, CancellationToken ct) =>
        PlaythroughState.Fold(pack, await store.ReadAsync(pack.Game.Id, ct));
}
