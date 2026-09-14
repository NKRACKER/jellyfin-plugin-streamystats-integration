using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.StreamystatsIntegration.Configuration;

/// <summary>Persisted plugin settings. No credential belongs in this object.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;

    public string MenuName { get; set; } = "Statistiken";

    public string StreamystatsPublicUrl { get; set; } = string.Empty;

    public string StreamystatsHealthUrl { get; set; } = string.Empty;

    public int HealthTimeoutSeconds { get; set; } = 4;

    public bool EnableBrowserFallback { get; set; } = true;

    public bool AllowAllUsers { get; set; } = true;

    public string[] AllowedUserIds { get; set; } = [];
}
