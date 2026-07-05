using Companion.Api.Contracts;
using Companion.Api.Infrastructure;
using Companion.Domain.Ports;
using Companion.Domain.Projections;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Features;

public sealed record GetAvailabilityQuery(string GameId) : IQuery<AvailabilityDto>;

public sealed class GetAvailabilityQueryHandler(IPackRegistry packs, IProgressEventStore store)
    : IQueryHandler<GetAvailabilityQuery, AvailabilityDto>
{
    public async Task<Result<AvailabilityDto>> Handle(GetAvailabilityQuery query, CancellationToken ct)
    {
        if (!packs.TryGet(query.GameId, out var pack))
        {
            return Result<AvailabilityDto>.Failure(Errors.GameNotFound(query.GameId));
        }

        var state = await Playthroughs.LoadAsync(pack, store, ct);
        return Result<AvailabilityDto>.Success(AvailabilityProjection.Project(pack, state).ToDto());
    }
}
