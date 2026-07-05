using Companion.Api.Contracts;
using Companion.Api.Infrastructure;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Features;

public sealed record GetPackQuery(string GameId) : IQuery<PackDto>;

public sealed class GetPackQueryHandler(IPackRegistry packs) : IQueryHandler<GetPackQuery, PackDto>
{
    public Task<Result<PackDto>> Handle(GetPackQuery query, CancellationToken ct) =>
        Task.FromResult(packs.TryGet(query.GameId, out var pack)
            ? Result<PackDto>.Success(pack.ToDto())
            : Result<PackDto>.Failure(Errors.GameNotFound(query.GameId)));
}
