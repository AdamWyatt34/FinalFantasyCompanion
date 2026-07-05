using Companion.Api.Contracts;
using Companion.Api.Infrastructure;
using Companion.Domain.Events;
using Companion.Domain.Model;
using Companion.Domain.Ports;
using Modulus.Mediator.Abstractions;

namespace Companion.Api.Features;

public sealed record AppendProgressEventCommand(string GameId, ProgressEventRequest Request)
    : ICommand<StateSnapshotDto>;

public sealed class AppendProgressEventCommandHandler(
    IPackRegistry packs,
    IProgressEventStore store,
    TimeProvider time)
    : ICommandHandler<AppendProgressEventCommand, StateSnapshotDto>
{
    public async Task<Result<StateSnapshotDto>> Handle(AppendProgressEventCommand cmd, CancellationToken ct)
    {
        if (!packs.TryGet(cmd.GameId, out var pack))
        {
            return Result<StateSnapshotDto>.Failure(Errors.GameNotFound(cmd.GameId));
        }

        var mapped = MapToEvent(pack, cmd.Request);
        if (mapped.IsFailure)
        {
            return Result<StateSnapshotDto>.Failure(mapped.Errors);
        }

        await store.AppendAsync(pack.Game.Id, mapped.Value, ct);

        var state = await Playthroughs.LoadAsync(pack, store, ct);
        return Result<StateSnapshotDto>.Success(new StateSnapshotDto(state.Position, [.. state.Collected]));
    }

    private Result<ProgressEvent> MapToEvent(Pack pack, ProgressEventRequest request)
    {
        var now = time.GetUtcNow();

        return request.Type switch
        {
            "positionAdvanced" or "positionCorrected" when request.To is null =>
                Result<ProgressEvent>.Failure(Errors.MissingField(request.Type, "to")),
            "positionAdvanced" or "positionCorrected" when pack.Positions.All(p => p.Order != request.To) =>
                Result<ProgressEvent>.Failure(Errors.UnknownPosition(request.To.Value)),
            "positionAdvanced" =>
                Result<ProgressEvent>.Success(new PositionAdvanced(request.To!.Value, now)),
            "positionCorrected" =>
                Result<ProgressEvent>.Success(new PositionCorrected(request.To!.Value, now)),

            "itemCollected" or "itemUncollected" when request.ItemId is null =>
                Result<ProgressEvent>.Failure(Errors.MissingField(request.Type, "itemId")),
            "itemCollected" or "itemUncollected" when pack.Items.All(i => i.Id != request.ItemId) =>
                Result<ProgressEvent>.Failure(Errors.UnknownItem(request.ItemId)),
            "itemCollected" =>
                Result<ProgressEvent>.Success(new ItemCollected(request.ItemId!, now)),
            "itemUncollected" =>
                Result<ProgressEvent>.Success(new ItemUncollected(request.ItemId!, now)),

            _ => Result<ProgressEvent>.Failure(Errors.UnknownEventType(request.Type)),
        };
    }
}
