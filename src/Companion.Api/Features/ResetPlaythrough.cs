using Companion.Api.Contracts;
using Companion.Api.Infrastructure;
using Companion.Domain.Ports;
using Companion.Domain.State;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Features;

public sealed record ResetPlaythroughCommand(string GameId) : ICommand<ResetResultDto>;

public sealed class ResetPlaythroughCommandHandler(IPackRegistry packs, IProgressEventStore store)
    : ICommandHandler<ResetPlaythroughCommand, ResetResultDto>
{
    public async Task<Result<ResetResultDto>> Handle(ResetPlaythroughCommand cmd, CancellationToken ct)
    {
        if (!packs.TryGet(cmd.GameId, out var pack))
        {
            return Result<ResetResultDto>.Failure(Errors.GameNotFound(cmd.GameId));
        }

        var archivedTo = await store.ResetAsync(pack.Game.Id, ct);
        var fresh = PlaythroughState.Initial(pack);

        return Result<ResetResultDto>.Success(
            new ResetResultDto(fresh.Position, [.. fresh.Collected], archivedTo));
    }
}
