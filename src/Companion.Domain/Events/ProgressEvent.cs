using System.Text.Json.Serialization;

namespace Companion.Domain.Events;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(PositionAdvanced), "positionAdvanced")]
[JsonDerivedType(typeof(PositionCorrected), "positionCorrected")]
[JsonDerivedType(typeof(ItemCollected), "itemCollected")]
[JsonDerivedType(typeof(ItemUncollected), "itemUncollected")]
public abstract record ProgressEvent(DateTimeOffset OccurredAt);

public sealed record PositionAdvanced(int To, DateTimeOffset OccurredAt) : ProgressEvent(OccurredAt);

public sealed record PositionCorrected(int To, DateTimeOffset OccurredAt) : ProgressEvent(OccurredAt);

public sealed record ItemCollected(string ItemId, DateTimeOffset OccurredAt) : ProgressEvent(OccurredAt);

public sealed record ItemUncollected(string ItemId, DateTimeOffset OccurredAt) : ProgressEvent(OccurredAt);
