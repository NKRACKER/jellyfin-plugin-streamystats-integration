using Jellyfin.Plugin.StreamystatsIntegration.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.StreamystatsIntegration;

/// <summary>Jellyfin 12 Streamystats integration plugin.</summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static readonly Guid PluginId = Guid.Parse("5f71ee42-35b3-4a77-a3d5-2cb529ba1220");

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Streamystats Integration";

    public override string Description => "Embeds Streamystats into Jellyfin 12 Web without modifying compiled web files.";

    public override Guid Id => PluginId;

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "StreamystatsIntegration",
            EmbeddedResourcePath = GetType().Namespace + ".Web.configPage.html",
            EnableInMainMenu = true
        };
    }

    public override void UpdateConfiguration(BasePluginConfiguration configuration)
    {
        var next = (PluginConfiguration)configuration;
        next.MenuName = string.IsNullOrWhiteSpace(next.MenuName) ? "Statistiken" : next.MenuName.Trim()[..Math.Min(next.MenuName.Trim().Length, 40)];
        next.HealthTimeoutSeconds = Math.Clamp(next.HealthTimeoutSeconds, 1, 15);
        next.AllowedUserIds = (next.AllowedUserIds ?? [])
            .Select(id => Guid.TryParse(id, out var parsed) ? parsed.ToString("N") : null)
            .Where(id => id is not null)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Cast<string>()
            .ToArray();

        if (!string.IsNullOrWhiteSpace(next.StreamystatsPublicUrl))
        {
            next.StreamystatsPublicUrl = UrlPolicy.NormalizePublicUrl(next.StreamystatsPublicUrl);
        }

        if (!string.IsNullOrWhiteSpace(next.StreamystatsHealthUrl))
        {
            next.StreamystatsHealthUrl = UrlPolicy.NormalizeHealthUrl(next.StreamystatsHealthUrl);
        }

        base.UpdateConfiguration(next);
    }
}
