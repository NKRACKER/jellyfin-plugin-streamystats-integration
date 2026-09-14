namespace Jellyfin.Plugin.StreamystatsIntegration;

/// <summary>Central URL validation used by configuration and tests.</summary>
public static class UrlPolicy
{
    public static string NormalizePublicUrl(string value)
    {
        var uri = Parse(value, nameof(value));
        var loopbackDevelopment = uri.IsLoopback && uri.Scheme == Uri.UriSchemeHttp;
        if (uri.Scheme != Uri.UriSchemeHttps && !loopbackDevelopment)
        {
            throw new ArgumentException("The public Streamystats URL must use HTTPS (HTTP is allowed only for loopback development).", nameof(value));
        }

        return Normalize(uri);
    }

    public static string NormalizeHealthUrl(string value)
    {
        var uri = Parse(value, nameof(value));
        if (uri.Scheme is not (Uri.UriSchemeHttp or Uri.UriSchemeHttps))
        {
            throw new ArgumentException("The health URL must use HTTP or HTTPS.", nameof(value));
        }

        return Normalize(uri);
    }

    private static Uri Parse(string value, string parameterName)
    {
        if (!Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
            || string.IsNullOrWhiteSpace(uri.Host)
            || !string.IsNullOrEmpty(uri.UserInfo)
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment))
        {
            throw new ArgumentException("The URL must be absolute and must not contain credentials, a query, or a fragment.", parameterName);
        }

        return uri;
    }

    private static string Normalize(Uri uri)
    {
        var builder = new UriBuilder(uri) { Query = string.Empty, Fragment = string.Empty };
        return builder.Uri.AbsoluteUri.TrimEnd('/');
    }
}
