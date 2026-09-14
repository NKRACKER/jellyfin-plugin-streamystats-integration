using Jellyfin.Plugin.StreamystatsIntegration.Services;
using MediaBrowser.Controller;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.StreamystatsIntegration.Controllers;

[ApiController]
[Route("StreamystatsIntegration")]
public sealed class IntegrationController : ControllerBase
{
    private const string UserIdClaim = "Jellyfin-UserId";
    private readonly StreamystatsHealthService _health;
    private readonly IServerApplicationHost _host;

    public IntegrationController(StreamystatsHealthService health, IServerApplicationHost host)
    {
        _health = health;
        _host = host;
    }

    [AllowAnonymous]
    [HttpGet("client.js")]
    [Produces("application/javascript")]
    public IActionResult GetClientScript()
    {
        var resource = typeof(Plugin).Namespace + ".Web.integration.js";
        var stream = typeof(Plugin).Assembly.GetManifestResourceStream(resource);
        return stream is null
            ? NotFound()
            : File(stream, "application/javascript; charset=utf-8");
    }

    [Authorize]
    [HttpGet("config")]
    public ActionResult<ClientConfiguration> GetConfiguration()
    {
        var config = Plugin.Instance?.Configuration;
        var userId = User.FindFirst(UserIdClaim)?.Value;
        if (config is null || !config.Enabled || !AccessPolicy.IsAllowed(config, userId))
        {
            return Forbid();
        }

        if (_host.ApplicationVersion.Major != 12)
        {
            return StatusCode(409, new { error = "unsupported_jellyfin_version" });
        }

        return new ClientConfiguration(
            config.MenuName,
            config.StreamystatsPublicUrl,
            config.EnableBrowserFallback,
            "12.0");
    }

    [Authorize]
    [HttpGet("health")]
    public async Task<ActionResult<HealthResult>> GetHealth(CancellationToken cancellationToken)
    {
        var config = Plugin.Instance?.Configuration;
        var userId = User.FindFirst(UserIdClaim)?.Value;
        if (config is null
            || !config.Enabled
            || (!User.IsInRole("Administrator") && !AccessPolicy.IsAllowed(config, userId)))
        {
            return Forbid();
        }

        return await _health.CheckAsync(cancellationToken).ConfigureAwait(false);
    }

}

public sealed record ClientConfiguration(string MenuName, string StreamystatsUrl, bool BrowserFallback, string JellyfinTarget);
