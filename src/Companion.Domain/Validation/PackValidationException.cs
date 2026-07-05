namespace Companion.Domain.Validation;

public sealed class PackValidationException(string packId, IReadOnlyList<string> errors)
    : Exception($"Pack '{packId}' failed validation:{Environment.NewLine}{string.Join(Environment.NewLine, errors)}")
{
    public string PackId { get; } = packId;

    public IReadOnlyList<string> Errors { get; } = errors;
}
