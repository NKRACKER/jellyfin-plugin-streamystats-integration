using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.StreamystatsIntegration.Services;

/// <summary>Injects the client script into Jellyfin 12 Web at response time.</summary>
public sealed class ScriptInjectionStartupFilter : IStartupFilter
{
    private const string Marker = "/StreamystatsIntegration/client.js";
    private readonly ILogger<ScriptInjectionStartupFilter> _logger;
    private int _logged;

    public ScriptInjectionStartupFilter(ILogger<ScriptInjectionStartupFilter> logger)
    {
        _logger = logger;
    }

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.Use(InvokeAsync);
            next(app);
        };
    }

    private async Task InvokeAsync(HttpContext context, Func<Task> next)
    {
        if (Plugin.Instance?.Configuration.Enabled != true
            || !HttpMethods.IsGet(context.Request.Method)
            || !IsWebIndex(context.Request.Path.Value))
        {
            await next().ConfigureAwait(false);
            return;
        }

        context.Request.Headers.Remove("Accept-Encoding");
        context.Request.Headers.Remove("Range");
        context.Request.Headers.Remove("If-Range");

        var destination = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        try
        {
            await next().ConfigureAwait(false);
        }
        catch
        {
            context.Response.Body = destination;
            throw;
        }

        context.Response.Body = destination;
        buffer.Position = 0;
        if (context.Response.StatusCode != StatusCodes.Status200OK
            || !(context.Response.ContentType?.Contains("text/html", StringComparison.OrdinalIgnoreCase) ?? false))
        {
            await buffer.CopyToAsync(destination).ConfigureAwait(false);
            return;
        }

        string html;
        using (var reader = new StreamReader(buffer, Encoding.UTF8, true, 1024, leaveOpen: true))
        {
            html = await reader.ReadToEndAsync().ConfigureAwait(false);
        }

        try
        {
            if (!html.Contains(Marker, StringComparison.OrdinalIgnoreCase))
            {
                var close = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
                if (close >= 0)
                {
                    var version = typeof(Plugin).Assembly.GetName().Version?.ToString() ?? "1";
                    var tag = $"<script src=\"../StreamystatsIntegration/client.js?v={version}\" defer></script>";
                    html = html.Insert(close, tag + Environment.NewLine);
                    if (Interlocked.Exchange(ref _logged, 1) == 0)
                    {
                        _logger.LogInformation("Streamystats Integration injected its Jellyfin 12 client module at request time.");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Client injection failed; serving the original Jellyfin Web shell.");
        }

        var bytes = Encoding.UTF8.GetBytes(html);
        context.Response.ContentType = "text/html;charset=utf-8";
        context.Response.ContentLength = bytes.Length;
        context.Response.Headers.Remove("ETag");
        context.Response.Headers.Remove("Last-Modified");
        context.Response.Headers.Remove("Accept-Ranges");
        await destination.WriteAsync(bytes).ConfigureAwait(false);
    }

    internal static bool IsWebIndex(string? path)
        => !string.IsNullOrEmpty(path)
            && (path.EndsWith("/web/index.html", StringComparison.OrdinalIgnoreCase)
                || path.EndsWith("/web/", StringComparison.OrdinalIgnoreCase)
                || path.Equals("/web", StringComparison.OrdinalIgnoreCase));
}
