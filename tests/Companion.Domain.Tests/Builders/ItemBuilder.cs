using Bogus;
using Companion.Domain.Model;

namespace Companion.Domain.Tests.Builders;

public sealed class ItemBuilder(string id)
{
    private static readonly Faker Faker = new() { Random = new Randomizer(1337) };

    private string? _name;
    private ItemType _type = ItemType.Materia;
    private string? _location;
    private int _opensAt = 1;
    private int? _closesAt;
    private List<string> _prereqs = [];
    private string? _notes;
    private RouteInfo? _route;

    public ItemBuilder Named(string name)
    {
        _name = name;
        return this;
    }

    public ItemBuilder OfType(ItemType type)
    {
        _type = type;
        return this;
    }

    public ItemBuilder Located(string location)
    {
        _location = location;
        return this;
    }

    public ItemBuilder WithNotes(string notes)
    {
        _notes = notes;
        return this;
    }

    public ItemBuilder Opens(int at)
    {
        _opensAt = at;
        return this;
    }

    public ItemBuilder Closes(int? at)
    {
        _closesAt = at;
        return this;
    }

    public ItemBuilder Window(int opensAt, int? closesAt)
    {
        _opensAt = opensAt;
        _closesAt = closesAt;
        return this;
    }

    public ItemBuilder Needs(params string[] prereqs)
    {
        _prereqs = [.. prereqs];
        return this;
    }

    public ItemBuilder Routed(int at, int rank = 0, string why = "curated")
    {
        _route = new RouteInfo(at, rank, why);
        return this;
    }

    public PackItem Build() => new(
        id,
        _name ?? Faker.Commerce.ProductName(),
        _type,
        _location ?? Faker.Address.City(),
        new AvailabilityWindow(_opensAt, _closesAt),
        _prereqs,
        _notes ?? Faker.Lorem.Sentence(),
        Verified: false,
        _route);
}
