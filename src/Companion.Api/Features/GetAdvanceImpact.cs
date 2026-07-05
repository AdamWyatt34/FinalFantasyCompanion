using Companion.Api.Contracts;
using Companion.Api.Infrastructure;
using Companion.Domain.Ports;
using Companion.Domain.Projections;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Features;

public sealed record GetAdvanceImpactQuery(string GameId, int To) : IQuery<AdvanceImpactDto>;

public sealed class GetAdvanceImpactQueryHandler(IPackRegistry packs, IProgressEventStore store)
    : IQueryHandler<GetAdvanceImpactQuery, AdvanceImpactDto>
{
    public async Task<Result<AdvanceImpactDto>> Handle(GetAdvanceImpactQuery query, CancellationToken ct)
    {
        if (!packs.TryGet(query.GameId, out var pack))
        {
            return Result<AdvanceImpactDto>.Failure(Errors.GameNotFound(query.GameId));
        }

        if (pack.Positions.All(p => p.Order != query.To))
        {
            return Result<AdvanceImpactDto>.Failure(Errors.UnknownPosition(query.To));
        }

        var state = await Playthroughs.LoadAsync(pack, store, ct);
        return Result<AdvanceImpactDto>.Success(
            AdvanceImpactCalculator.Compute(pack, state, query.To).ToDto());
    }
}
