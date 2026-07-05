using Companion.Domain.Model;

namespace Companion.Domain.Tests.Builders;

public sealed class PackBuilder
{
    private GameInfo _game = new("test", "Test Game");
    private readonly ThemeTokens _theme = new(new Dictionary<string, string>());
    private readonly List<StoryPosition> _positions = [];
    private readonly List<PackItem> _items = [];

    public PackBuilder ForGame(string id, string title = "Test Game")
    {
        _game = new GameInfo(id, title);
        return this;
    }

    /// <summary>Adds positions with orders 1..count, all on the given disc.</summary>
    public PackBuilder WithPositions(int count, int disc = 1)
    {
        for (var i = 1; i <= count; i++)
        {
            _positions.Add(new StoryPosition($"pos{i}", i, $"Beat {i}", disc));
        }

        return this;
    }

    public PackBuilder WithPosition(string id, int order, string label = "", int disc = 1)
    {
        _positions.Add(new StoryPosition(id, order, label.Length > 0 ? label : $"Beat {order}", disc));
        return this;
    }

    public PackBuilder WithItem(PackItem item)
    {
        _items.Add(item);
        return this;
    }

    public PackBuilder WithItem(string id, Func<ItemBuilder, ItemBuilder> configure)
    {
        _items.Add(configure(new ItemBuilder(id)).Build());
        return this;
    }

    public Pack Build() => new(_game, _theme, _positions, _items);
}
