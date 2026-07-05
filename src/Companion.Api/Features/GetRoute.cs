using Companion.Api.Contracts;
using Companion.Api.Infrastructure;
using Companion.Domain.Ports;
using Companion.Domain.Projections;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Features;

public sealed record GetRouteQuery(string GameId) : IQuery<RouteDto>;

public sealed class GetRouteQueryHandler(IPackRegistry packs, IProgressEventStore store)
    : IQueryHandler<GetRouteQuery, RouteDto>
{
    public async Task<Result<RouteDto>> Handle(GetRouteQuery query, CancellationToken ct)
    {
        if (!packs.TryGet(query.GameId, out var pack))
        {
            return Result<RouteDto>.Failure(Errors.GameNotFound(query.GameId));
        }

        var state = await Playthroughs.LoadAsync(pack, store, ct);
        return Result<RouteDto>.Success(RouteProjection.Project(pack, state).ToDto());
    }
}
