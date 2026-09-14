using Xunit;

namespace Jellyfin.Plugin.StreamystatsIntegration.Tests;

public sealed class UrlPolicyTests
{
    [Theory]
    [InlineData("https://stats.media.example.com/", "https://stats.media.example.com")]
    [InlineData("http://localhost:3000/", "http://localhost:3000")]
    public void PublicUrl_AllowsHttpsAndLoopbackDevelopment(string input, string expected)
        => Assert.Equal(expected, UrlPolicy.NormalizePublicUrl(input));

    [Theory]
    [InlineData("http://stats.example.com")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://user:pass@stats.example.com")]
    [InlineData("https://stats.example.com?token=secret")]
    [InlineData("https://stats.example.com/#token")]
    public void PublicUrl_RejectsUnsafeValues(string input)
        => Assert.Throws<ArgumentException>(() => UrlPolicy.NormalizePublicUrl(input));

    [Fact]
    public void HealthUrl_AllowsPrivateDockerHttpWithoutCredentials()
        => Assert.Equal("http://streamystats:3000", UrlPolicy.NormalizeHealthUrl("http://streamystats:3000/"));
}

public sealed class AccessPolicyTests
{
    private const string UserA = "11111111-1111-1111-1111-111111111111";
    private const string UserB = "22222222-2222-2222-2222-222222222222";

    [Fact]
    public void MissingIdentityAlwaysFailsClosed()
        => Assert.False(AccessPolicy.IsAllowed(new Configuration.PluginConfiguration { AllowAllUsers = true }, null));

    [Fact]
    public void AllowAllStillRequiresAValidAuthenticatedUserId()
    {
        var config = new Configuration.PluginConfiguration { AllowAllUsers = true };
        Assert.True(AccessPolicy.IsAllowed(config, UserA));
        Assert.False(AccessPolicy.IsAllowed(config, "not-a-guid"));
    }

    [Fact]
    public void AllowListDoesNotPermitAnotherUser()
    {
        var config = new Configuration.PluginConfiguration { AllowAllUsers = false, AllowedUserIds = [UserA] };
        Assert.True(AccessPolicy.IsAllowed(config, UserA));
        Assert.False(AccessPolicy.IsAllowed(config, UserB));
    }
}

public sealed class WebIndexContractTests
{
    [Theory]
    [InlineData("/web")]
    [InlineData("/web/")]
    [InlineData("/web/index.html")]
    [InlineData("/jellyfin/web/index.html")]
    public void MatchesSupportedShellPaths(string path)
        => Assert.True(Services.ScriptInjectionStartupFilter.IsWebIndex(path));

    [Theory]
    [InlineData("/")]
    [InlineData("/Items")]
    [InlineData("/web/main.js")]
    public void DoesNotTouchOtherResponses(string path)
        => Assert.False(Services.ScriptInjectionStartupFilter.IsWebIndex(path));
}
