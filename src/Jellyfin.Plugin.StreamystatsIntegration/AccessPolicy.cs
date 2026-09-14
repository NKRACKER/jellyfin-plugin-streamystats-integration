using Jellyfin.Plugin.StreamystatsIntegration.Configuration;

namespace Jellyfin.Plugin.StreamystatsIntegration;

internal static class AccessPolicy
{
    internal static bool IsAllowed(PluginConfiguration config, string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId) || !Guid.TryParse(userId, out var parsed))
        {
            return false;
        }

        return config.AllowAllUsers
            || (config.AllowedUserIds ?? []).Contains(parsed.ToString("N"), StringComparer.OrdinalIgnoreCase);
    }
}
