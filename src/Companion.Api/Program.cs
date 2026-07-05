using System.Text.Json.Serialization;
using Companion.Api;
using Companion.Api.Endpoints;
using Companion.Api.Infrastructure;
using Companion.Domain.Ports;
using Microsoft.Extensions.Options;
using Modulus.Mediator;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<CompanionOptions>(builder.Configuration.GetSection(CompanionOptions.SectionName));
builder.Services.PostConfigure<CompanionOptions>(o =>
{
    o.PackDirectory = Path.GetFullPath(o.PackDirectory, builder.Environment.ContentRootPath);
    o.PlaythroughDirectory = Path.GetFullPath(o.PlaythroughDirectory, builder.Environment.ContentRootPath);
});

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.CamelCase)));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IPackRegistry>(sp =>
    new PackRegistry(PackLoader.LoadAll(sp.GetRequiredService<IOptions<CompanionOptions>>().Value.PackDirectory)));
builder.Services.AddSingleton<IProgressEventStore, FileProgressEventStore>();
builder.Services.AddModulusMediator();
builder.Services.AddModulusHandlers();

var app = builder.Build();

// Load and validate every pack before serving a single request — fail fast on bad data.
_ = app.Services.GetRequiredService<IPackRegistry>();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGameEndpoints();

// Unmatched /api routes must 404 as JSON, never fall through to the SPA's index.html.
app.MapFallback("/api/{**rest}", () =>
    Results.Problem(title: "NotFound", detail: "No such API route", statusCode: StatusCodes.Status404NotFound));
app.MapFallbackToFile("{*path:nonfile}", "index.html");

app.Run();

public partial class Program;
