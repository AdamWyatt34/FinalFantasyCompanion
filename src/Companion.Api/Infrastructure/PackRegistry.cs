using System.Diagnostics.CodeAnalysis;
using Companion.Domain.Model;

namespace Companion.Api.Infrastructure;

public interface IPackRegistry
{
    IReadOnlyList<Pack> All { get; }

    bool TryGet(string gameId, [NotNullWhen(true)] out Pack? pack);
}

public sealed class PackRegistry(IReadOnlyList<Pack> packs) : IPackRegistry
{
    private readonly Dictionary<string, Pack> _byId =
        packs.ToDictionary(p => p.Game.Id, StringComparer.OrdinalIgnoreCase);

    public IReadOnlyList<Pack> All { get; } = packs;

    public bool TryGet(string gameId, [NotNullWhen(true)] out Pack? pack) =>
        _byId.TryGetValue(gameId, out pack);
}
