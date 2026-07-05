using System.Text.Json;
using System.Text.Json.Serialization;

namespace Companion.Api.Infrastructure;

/// <summary>
/// The one serializer configuration for the event log. Deliberately decoupled from
/// ASP.NET's web defaults so API JSON policy changes can never drift the on-disk format.
/// </summary>
public static class EventJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        AllowOutOfOrderMetadataProperties = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };
}
