using System.Text.Json;
using Companion.Domain.Model;
using Companion.Domain.Validation;

namespace Companion.Api.Infrastructure;

/// <summary>Loads and validates every pack at startup. Any failure aborts the process — fail fast.</summary>
public static class PackLoader
{
    public static IReadOnlyList<Pack> LoadAll(string directory)
    {
        if (!Directory.Exists(directory))
        {
            throw new DirectoryNotFoundException($"Pack directory not found: {directory}");
        }

        var packs = new List<Pack>();
        foreach (var file in Directory.EnumerateFiles(directory, "*.json").OrderBy(f => f, StringComparer.Ordinal))
        {
            Pack pack;
            try
            {
                pack = JsonSerializer.Deserialize<Pack>(File.ReadAllText(file), PackJson.Options)
                    ?? throw new InvalidDataException($"Pack file '{file}' deserialized to null");
            }
            catch (JsonException ex)
            {
                throw new InvalidDataException($"Pack file '{file}' is not valid JSON: {ex.Message}", ex);
            }

            PackValidator.ValidateOrThrow(pack);
            packs.Add(pack);
        }

        if (packs.Count == 0)
        {
            throw new InvalidDataException($"No packs found in {directory}");
        }

        return packs;
    }
}
