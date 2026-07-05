using Companion.Api.Contracts;
using Companion.Api.Features;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Endpoints;

public static class GameEndpoints
{
    public static IEndpointRouteBuilder MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        var games = app.MapGroup("/api/games");

        games.MapGet("", async (IMediator mediator, CancellationToken ct) =>
            ApiResults.Ok(await mediator.Query(new GetGamesQuery(), ct)));

        games.MapGet("/{gameId}/pack", async (string gameId, IMediator mediator, CancellationToken ct) =>
            ApiResults.Ok(await mediator.Query(new GetPackQuery(gameId), ct)));

        games.MapGet("/{gameId}/availability", async (string gameId, IMediator mediator, CancellationToken ct) =>
            ApiResults.Ok(await mediator.Query(new GetAvailabilityQuery(gameId), ct)));

        games.MapGet("/{gameId}/route", async (string gameId, IMediator mediator, CancellationToken ct) =>
            ApiResults.Ok(await mediator.Query(new GetRouteQuery(gameId), ct)));

        games.MapGet("/{gameId}/advance-impact", async (string gameId, int to, IMediator mediator, CancellationToken ct) =>
            ApiResults.Ok(await mediator.Query(new GetAdvanceImpactQuery(gameId, to), ct)));

        games.MapPost("/{gameId}/events", async (string gameId, ProgressEventRequest body, IMediator mediator, CancellationToken ct) =>
            ApiResults.Ok(await mediator.Send(new AppendProgressEventCommand(gameId, body), ct)));

        games.MapPost("/{gameId}/reset", async (string gameId, IMediator mediator, CancellationToken ct) =>
            ApiResults.Ok(await mediator.Send(new ResetPlaythroughCommand(gameId), ct)));

        return app;
    }
}
