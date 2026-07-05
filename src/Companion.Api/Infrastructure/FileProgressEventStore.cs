using System.Collections.Concurrent;
using System.Text.Json;
using Companion.Domain.Events;
using Companion.Domain.Ports;
using Microsoft.Extensions.Options;

namespace Companion.Api.Infrastructure;

/// <summary>
/// Append-only JSONL event log per game under the playthrough directory.
/// Reset archives the active log with a timestamp suffix and starts fresh.
/// Registered as a singleton; a per-game semaphore covers concurrent browser tabs.
/// </summary>
public sealed class FileProgressEventStore(IOptions<CompanionOptions> options, TimeProvider time)
    : IProgressEventStore
{
    private readonly string _directory = options.Value.PlaythroughDirectory;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public async Task<IReadOnlyList<ProgressEvent>> ReadAsync(string gameId, CancellationToken ct = default)
    {
        var gate = Lock(gameId);
        await gate.WaitAsync(ct);
        try
        {
            var path = ActivePath(gameId);
            if (!File.Exists(path))
            {
                return [];
            }

            var events = new List<ProgressEvent>();
            var lineNumber = 0;
            foreach (var line in await File.ReadAllLinesAsync(path, ct))
            {
                lineNumber++;
                if (string.IsNullOrWhiteSpace(line))
                {
                    continue;
                }

                var evt = JsonSerializer.Deserialize<ProgressEvent>(line, EventJson.Options)
                    ?? throw new InvalidDataException($"{path}:{lineNumber}: event deserialized to null");
                events.Add(evt);
            }

            return events;
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException(
                $"Corrupt event log for game '{gameId}' at {ActivePath(gameId)}: {ex.Message}", ex);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task AppendAsync(string gameId, ProgressEvent evt, CancellationToken ct = default)
    {
        var gate = Lock(gameId);
        await gate.WaitAsync(ct);
        try
        {
            Directory.CreateDirectory(_directory);
            var line = JsonSerializer.Serialize(evt, EventJson.Options);
            await File.AppendAllTextAsync(ActivePath(gameId), line + Environment.NewLine, ct);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<string?> ResetAsync(string gameId, CancellationToken ct = default)
    {
        var gate = Lock(gameId);
        await gate.WaitAsync(ct);
        try
        {
            var path = ActivePath(gameId);
            if (!File.Exists(path))
            {
                return null;
            }

            var archivePath = NextArchivePath(gameId);
            File.Move(path, archivePath);
            return Path.GetFileName(archivePath);
        }
        finally
        {
            gate.Release();
        }
    }

    private SemaphoreSlim Lock(string gameId) =>
        _locks.GetOrAdd(gameId, _ => new SemaphoreSlim(1, 1));

    private string ActivePath(string gameId) =>
        Path.Combine(_directory, $"{gameId}.events.jsonl");

    private string NextArchivePath(string gameId)
    {
        var stamp = time.GetLocalNow().ToString("yyyyMMdd-HHmmss");
        var basePath = Path.Combine(_directory, $"{gameId}.events.{stamp}");
        var candidate = $"{basePath}.archive.jsonl";
        for (var n = 2; File.Exists(candidate); n++)
        {
            candidate = $"{basePath}-{n}.archive.jsonl";
        }

        return candidate;
    }
}
