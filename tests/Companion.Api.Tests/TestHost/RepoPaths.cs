namespace Companion.Api.Tests.TestHost;

public static class RepoPaths
{
    /// <summary>Walks up from the test bin directory to the repo root (identified by data/packs).</summary>
    public static string PackDirectory
    {
        get
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir is not null)
            {
                var candidate = Path.Combine(dir.FullName, "data", "packs");
                if (Directory.Exists(candidate))
                {
                    return candidate;
                }

                dir = dir.Parent;
            }

            throw new DirectoryNotFoundException("Could not locate data/packs above the test directory");
        }
    }
}
