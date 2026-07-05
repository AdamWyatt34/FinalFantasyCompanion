using Companion.Api.Contracts;
using Companion.Api.Infrastructure;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Features;

public sealed record GetGamesQuery : IQuery<IReadOnlyList<GameSummaryDto>>;

public sealed class GetGamesQueryHandler(IPackRegistry packs)
    : IQueryHandler<GetGamesQuery, IReadOnlyList<GameSummaryDto>>
{
    public Task<Result<IReadOnlyList<GameSummaryDto>>> Handle(GetGamesQuery query, CancellationToken ct)
    {
        IReadOnlyList<GameSummaryDto> games =
            [.. packs.All.Select(p => new GameSummaryDto(p.Game.Id, p.Game.Title))];

        return Task.FromResult(Result<IReadOnlyList<GameSummaryDto>>.Success(games));
    }
}
