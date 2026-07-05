using Companion.Domain.Model;

namespace Companion.Domain.Validation;

/// <summary>Structural validation, fail fast at load. Collects every error before reporting.</summary>
public static class PackValidator
{
    public static void ValidateOrThrow(Pack pack)
    {
        var errors = Validate(pack);
        if (errors.Count > 0)
        {
            throw new PackValidationException(pack.Game.Id, errors);
        }
    }

    public static IReadOnlyList<string> Validate(Pack pack)
    {
        var errors = new List<string>();

        foreach (var dup in pack.Positions.GroupBy(p => p.Order).Where(g => g.Count() > 1))
        {
            errors.Add($"duplicate position order {dup.Key}");
        }

        foreach (var dup in pack.Positions.GroupBy(p => p.Id).Where(g => g.Count() > 1))
        {
            errors.Add($"duplicate position id '{dup.Key}'");
        }

        foreach (var dup in pack.Items.GroupBy(i => i.Id).Where(g => g.Count() > 1))
        {
            errors.Add($"duplicate item id '{dup.Key}'");
        }

        var orders = pack.Positions.Select(p => p.Order).ToHashSet();
        var itemIds = pack.Items.Select(i => i.Id).ToHashSet();

        foreach (var item in pack.Items)
        {
            foreach (var prereq in item.Prereqs.Where(pr => !itemIds.Contains(pr)))
            {
                errors.Add($"item '{item.Id}' has unknown prereq '{prereq}'");
            }

            if (!orders.Contains(item.Window.OpensAt))
            {
                errors.Add($"item '{item.Id}' opensAt {item.Window.OpensAt} references a missing position order");
            }

            if (item.Window.ClosesAt is { } closesAt && !orders.Contains(closesAt))
            {
                errors.Add($"item '{item.Id}' closesAt {closesAt} references a missing position order");
            }

            if (item.Window.ClosesAt < item.Window.OpensAt)
            {
                errors.Add($"item '{item.Id}' closesAt {item.Window.ClosesAt} is before opensAt {item.Window.OpensAt}");
            }

            if (item.Route is { } route && !orders.Contains(route.At))
            {
                errors.Add($"item '{item.Id}' route.at {route.At} references a missing position order");
            }
        }

        errors.AddRange(FindPrereqCycles(pack));

        return errors;
    }

    private static IEnumerable<string> FindPrereqCycles(Pack pack)
    {
        // Duplicate ids are reported separately; keep the first so cycle detection still runs.
        var items = pack.Items.GroupBy(i => i.Id).ToDictionary(g => g.Key, g => g.First());
        var state = new Dictionary<string, VisitState>();
        var reported = new HashSet<string>();

        foreach (var id in items.Keys)
        {
            Visit(id, []);
        }

        return reported;

        void Visit(string id, List<string> path)
        {
            if (!items.TryGetValue(id, out var item) || state.GetValueOrDefault(id) == VisitState.Done)
            {
                return;
            }

            if (state.GetValueOrDefault(id) == VisitState.InProgress)
            {
                var cycleStart = path.IndexOf(id);
                var cycle = path[cycleStart..];
                reported.Add($"prereq cycle: {string.Join(" -> ", [.. cycle, id])}");
                return;
            }

            state[id] = VisitState.InProgress;
            path.Add(id);

            foreach (var prereq in item.Prereqs)
            {
                Visit(prereq, path);
            }

            path.RemoveAt(path.Count - 1);
            state[id] = VisitState.Done;
        }
    }

    private enum VisitState
    {
        Unvisited,
        InProgress,
        Done,
    }
}
