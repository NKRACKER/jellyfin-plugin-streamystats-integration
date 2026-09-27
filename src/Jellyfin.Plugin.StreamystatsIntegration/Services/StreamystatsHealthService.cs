using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.StreamystatsIntegration.Services;

/// <summary>Performs bounded, credential-free Streamystats availability and framing probes.</summary>
public sealed class StreamystatsHealthService
{
    public const string ClientName = "StreamystatsIntegration.Health";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);
    private readonly IHttpClientFactory _factory;
    private readonly ILogger<StreamystatsHealthService> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private HealthResult? _cached;

    public StreamystatsHealthService(IHttpClientFactory factory, ILogger<StreamystatsHealthService> logger)
    {
        _factory = factory;
        _logger = logger;
    }

    public async Task<HealthResult> CheckAsync(CancellationToken cancellationToken)
    {
        var config = Plugin.Instance?.Configuration;
        if (config is null || !config.Enabled || string.IsNullOrWhiteSpace(config.StreamystatsPublicUrl))
        {
            return new HealthResult(false, "not_configured", null, false, null, DateTimeOffset.UtcNow);
        }

        if (_cached is not null && DateTimeOffset.UtcNow - _cached.CheckedAt < CacheDuration)
        {
            return _cached;
        }

        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_cached is not null && DateTimeOffset.UtcNow - _cached.CheckedAt < CacheDuration)
            {
                return _cached;
            }

            var timeout = TimeSpan.FromSeconds(config.HealthTimeoutSeconds);
            var healthTarget = string.IsNullOrWhiteSpace(config.StreamystatsHealthUrl)
                ? config.StreamystatsPublicUrl
                : config.StreamystatsHealthUrl;

            var health = await ProbeAsync(healthTarget, timeout, cancellationToken).ConfigureAwait(false);
            var framing = healthTarget == config.StreamystatsPublicUrl
                ? health
                : await ProbeAsync(config.StreamystatsPublicUrl, timeout, cancellationToken).ConfigureAwait(false);

            var reachable = health.Status is >= 200 and < 500;
            var state = health.Error ?? (reachable ? "reachable" : "upstream_error");
            var policy = framing.Headers is null ? FramePolicy.Unknown : FramePolicy.From(framing.Headers);
            _cached = new HealthResult(reachable, state, health.Status, policy.Embeddable, policy.FrameAncestors, DateTimeOffset.UtcNow);
        }
        finally
        {
            _gate.Release();
        }

        return _cached!;
    }

    private async Task<ProbeResult> ProbeAsync(string target, TimeSpan timeout, CancellationToken cancellationToken)
    {
        try
        {
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            linked.CancelAfter(timeout);
            using var request = new HttpRequestMessage(HttpMethod.Get, target);
            request.Headers.UserAgent.ParseAdd("Jellyfin-Streamystats-Integration/1.1");
            using var response = await _factory.CreateClient(ClientName)
                .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, linked.Token)
                .ConfigureAwait(false);
            return new ProbeResult((int)response.StatusCode, response.Headers, null);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Streamystats probe timed out: {Target}", target);
            return new ProbeResult(null, null, "timeout");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning("Streamystats probe failed for {Target}: {ErrorType}", target, ex.GetType().Name);
            return new ProbeResult(null, null, "unreachable");
        }
    }

    private sealed record ProbeResult(int? Status, HttpResponseHeaders? Headers, string? Error);
}

/// <summary>Evaluates whether browsers may frame a response, following CSP-over-XFO precedence.</summary>
public sealed record FramePolicy(bool Embeddable, string? FrameAncestors)
{
    public static readonly FramePolicy Unknown = new(false, null);

    public static FramePolicy From(HttpResponseHeaders headers)
    {
        var csp = headers.TryGetValues("Content-Security-Policy", out var cspValues) ? string.Join(';', cspValues) : null;
        var xfo = headers.TryGetValues("X-Frame-Options", out var xfoValues) ? string.Join(',', xfoValues) : null;
        return From(csp, xfo);
    }

    public static FramePolicy From(string? contentSecurityPolicy, string? xFrameOptions)
    {
        var ancestors = contentSecurityPolicy?
            .Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault(d => d.StartsWith("frame-ancestors", StringComparison.OrdinalIgnoreCase))?["frame-ancestors".Length..]
            .Trim();

        if (ancestors is not null)
        {
            var blocked = ancestors.Length == 0 || ancestors.Equals("'none'", StringComparison.OrdinalIgnoreCase);
            return new FramePolicy(!blocked, ancestors);
        }

        // Browsers only honour XFO when CSP frame-ancestors is absent; any XFO value blocks a different origin.
        return new FramePolicy(string.IsNullOrWhiteSpace(xFrameOptions), null);
    }
}

public sealed record HealthResult(bool Reachable, string State, int? StatusCode, bool Embeddable, string? FrameAncestors, DateTimeOffset CheckedAt);
