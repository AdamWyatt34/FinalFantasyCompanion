using Companion.Domain.Events;

namespace Companion.Domain.Ports;

public interface IProgressEventStore
{
    Task<IReadOnlyList<ProgressEvent>> ReadAsync(string gameId, CancellationToken ct = default);

    Task AppendAsync(string gameId, ProgressEvent evt, CancellationToken ct = default);

    /// <summary>Archives the current event log and starts fresh. Returns the archive file name, or null if the log was empty.</summary>
    Task<string?> ResetAsync(string gameId, CancellationToken ct = default);
}
