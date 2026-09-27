using Jellyfin.Plugin.StreamystatsIntegration.Services;
using Xunit;

namespace Jellyfin.Plugin.StreamystatsIntegration.Tests;

public sealed class FramePolicyTests
{
    [Theory]
    [InlineData(null, "DENY", false, null)]
    [InlineData(null, "SAMEORIGIN", false, null)]
    [InlineData(null, null, true, null)]
    [InlineData("frame-ancestors 'none'", null, false, "'none'")]
    [InlineData("default-src 'self'; frame-ancestors 'self' https://media.example.com", "DENY", true, "'self' https://media.example.com")]
    [InlineData("default-src 'self'", "DENY", false, null)]
    public void EvaluatesCspBeforeXfo(string? csp, string? xfo, bool embeddable, string? ancestors)
    {
        var policy = FramePolicy.From(csp, xfo);
        Assert.Equal(embeddable, policy.Embeddable);
        Assert.Equal(ancestors, policy.FrameAncestors);
    }
}
