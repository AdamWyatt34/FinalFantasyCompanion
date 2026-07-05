using Modulus.Mediator.Abstractions;

namespace Companion.Api.Endpoints;

public static class ApiResults
{
    public static IResult Ok<T>(Result<T> result) =>
        result.Match(Results.Ok, Problem);

    public static IResult Problem<T>(Result<T> result) => Problem(result.Errors);

    private static IResult Problem(IReadOnlyList<Error> errors)
    {
        var first = errors.Count > 0
            ? errors[0]
            : Error.Failure("Unknown", "Unknown error");

        return Results.Problem(
            title: first.Code,
            detail: first.Description,
            statusCode: first.Type switch
            {
                ErrorType.Validation => StatusCodes.Status400BadRequest,
                ErrorType.NotFound => StatusCodes.Status404NotFound,
                ErrorType.Conflict => StatusCodes.Status409Conflict,
                ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
                ErrorType.Forbidden => StatusCodes.Status403Forbidden,
                _ => StatusCodes.Status500InternalServerError,
            });
    }
}
