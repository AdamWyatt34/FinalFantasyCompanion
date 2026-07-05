using System.Text.Json;
using System.Text.Json.Serialization;

namespace Companion.Api.Infrastructure;

/// <summary>Serializer configuration for reading content packs from disk.</summary>
public static class PackJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };
}
