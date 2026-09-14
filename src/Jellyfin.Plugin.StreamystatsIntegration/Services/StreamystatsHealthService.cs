using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.StreamystatsIntegration.Services;

/// <summary>Performs bounded, credential-free Streamystats availability probes.</summary>
public sealed class StreamystatsHealthService
{
    public const string ClientName = "StreamystatsIntegration.Health";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(10);
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
            return new HealthResult(false, "not_configured", null, DateTimeOffset.UtcNow);
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

            var target = string.IsNullOrWhiteSpace(config.StreamystatsHealthUrl)
                ? config.StreamystatsPublicUrl
                : config.StreamystatsHealthUrl;
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(config.HealthTimeoutSeconds));
            using var request = new HttpRequestMessage(HttpMethod.Get, target);
            request.Headers.UserAgent.ParseAdd("Jellyfin-Streamystats-Integration/1.0");
            using var response = await _factory.CreateClient(ClientName)
                .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token)
                .ConfigureAwait(false);
            var status = (int)response.StatusCode;
            var reachable = status is >= 200 and < 500;
            _cached = new HealthResult(reachable, reachable ? "reachable" : "upstream_error", (int)response.StatusCode, DateTimeOffset.UtcNow);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Streamystats health probe timed out.");
            _cached = new HealthResult(false, "timeout", null, DateTimeOffset.UtcNow);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning("Streamystats health probe failed: {ErrorType}", ex.GetType().Name);
            _cached = new HealthResult(false, "unreachable", null, DateTimeOffset.UtcNow);
        }
        finally
        {
            _gate.Release();
        }

        return _cached!;
    }
}

public sealed record HealthResult(bool Reachable, string State, int? StatusCode, DateTimeOffset CheckedAt);
