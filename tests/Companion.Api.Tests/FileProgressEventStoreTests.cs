using Companion.Api.Infrastructure;
using Companion.Domain.Events;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Shouldly;

namespace Companion.Api.Tests;

public sealed class FileProgressEventStoreTests : IDisposable
{
    private static readonly DateTimeOffset Timestamp = new(2026, 7, 5, 12, 0, 0, TimeSpan.Zero);

    private readonly string _dir = Path.Combine(
        Path.GetTempPath(), "ffcompanion-tests", Guid.NewGuid().ToString("N"));

    private readonly FakeTimeProvider _time = new(Timestamp);
    private readonly FileProgressEventStore _store;

    public FileProgressEventStoreTests()
    {
        _store = new FileProgressEventStore(
            Options.Create(new CompanionOptions { PlaythroughDirectory = _dir }), _time);
    }

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, recursive: true);
        }
    }

    [Fact]
    public async Task Read_OnMissingLog_ReturnsEmpty()
    {
        (await _store.ReadAsync("ff7")).ShouldBeEmpty();
    }

    [Fact]
    public async Task AppendThenRead_RoundTripsAllFourEventTypes_WithConcreteClrTypes()
    {
        await _store.AppendAsync("ff7", new PositionAdvanced(2, Timestamp));
        await _store.AppendAsync("ff7", new PositionCorrected(1, Timestamp));
        await _store.AppendAsync("ff7", new ItemCollected("beta", Timestamp));
        await _store.AppendAsync("ff7", new ItemUncollected("beta", Timestamp));

        var events = await _store.ReadAsync("ff7");

        events.ShouldBe([
            new PositionAdvanced(2, Timestamp),
            new PositionCorrected(1, Timestamp),
            new ItemCollected("beta", Timestamp),
            new ItemUncollected("beta", Timestamp),
        ]);
    }

    [Fact]
    public async Task Reset_ArchivesTheLog_AndReadReturnsEmpty()
    {
        await _store.AppendAsync("ff7", new ItemCollected("beta", Timestamp));

        var archive = await _store.ResetAsync("ff7");

        archive.ShouldNotBeNull();
        archive.ShouldEndWith(".archive.jsonl");
        File.Exists(Path.Combine(_dir, archive)).ShouldBeTrue();
        (await _store.ReadAsync("ff7")).ShouldBeEmpty();
    }

    [Fact]
    public async Task Reset_OnEmptyStore_ReturnsNull()
    {
        (await _store.ResetAsync("ff7")).ShouldBeNull();
    }

    [Fact]
    public async Task AppendAfterReset_WritesToAFreshLog()
    {
        await _store.AppendAsync("ff7", new ItemCollected("old", Timestamp));
        await _store.ResetAsync("ff7");

        await _store.AppendAsync("ff7", new ItemCollected("new", Timestamp));

        var events = await _store.ReadAsync("ff7");
        events.ShouldBe([new ItemCollected("new", Timestamp)]);
    }

    [Fact]
    public async Task TwoResetsAtTheSameTimestamp_DoNotCollide()
    {
        await _store.AppendAsync("ff7", new ItemCollected("a", Timestamp));
        var first = await _store.ResetAsync("ff7");

        await _store.AppendAsync("ff7", new ItemCollected("b", Timestamp));
        var second = await _store.ResetAsync("ff7");

        second.ShouldNotBe(first);
        File.Exists(Path.Combine(_dir, second!)).ShouldBeTrue();
    }

    [Fact]
    public async Task CorruptLine_ThrowsInvalidData_NamingTheFile()
    {
        Directory.CreateDirectory(_dir);
        await File.WriteAllTextAsync(
            Path.Combine(_dir, "ff7.events.jsonl"),
            """{"type":"itemCollected","itemId":"ok","occurredAt":"2026-07-05T12:00:00Z"}""" + "\n not-json \n");

        var ex = await Should.ThrowAsync<InvalidDataException>(() => _store.ReadAsync("ff7"));

        ex.Message.ShouldContain("ff7");
    }

    [Fact]
    public async Task LogsAreIsolatedPerGame()
    {
        await _store.AppendAsync("ff7", new ItemCollected("beta", Timestamp));

        (await _store.ReadAsync("ff8")).ShouldBeEmpty();
    }
}
