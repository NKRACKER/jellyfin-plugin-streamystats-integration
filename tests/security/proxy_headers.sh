#!/usr/bin/env bash
set -euo pipefail

stats_url="${1:?Usage: proxy_headers.sh https://stats.media.example.com https://media.example.com}"
jellyfin_origin="${2:?Missing Jellyfin origin}"
headers="$(curl -fsSI "${stats_url}")"

if grep -Eiq '^x-frame-options:[[:space:]]*(deny|sameorigin)' <<<"${headers}"; then
  echo "FAIL: Streamystats still sends a blocking X-Frame-Options header" >&2
  exit 1
fi

if ! grep -Eiq "^content-security-policy:.*frame-ancestors[^;]*${jellyfin_origin//./\\.}" <<<"${headers}"; then
  echo "FAIL: CSP frame-ancestors does not contain the expected Jellyfin origin" >&2
  exit 1
fi

reset_headers="$(curl -fsS -X POST -D - -o /dev/null -H "Origin: ${jellyfin_origin}" "${stats_url%/}/__jellyfin_integration_reset")"
if ! grep -Eiq '^x-ssi-session-reset:[[:space:]]*1' <<<"${reset_headers}"; then
  echo "FAIL: session-reset confirmation header is missing" >&2
  exit 1
fi
if ! grep -Eiq "^access-control-allow-origin:[[:space:]]*${jellyfin_origin//./\\.}" <<<"${reset_headers}"; then
  echo "FAIL: session-reset CORS origin does not match Jellyfin" >&2
  exit 1
fi
if [[ "$(grep -Eic '^set-cookie:[[:space:]]*streamystats-(session|token)=' <<<"${reset_headers}")" -lt 2 ]]; then
  echo "FAIL: session-reset does not expire both Streamystats authentication cookies" >&2
  exit 1
fi

denied_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  -H 'Origin: https://not-the-jellyfin-origin.invalid' \
  "${stats_url%/}/__jellyfin_integration_reset")"
if [[ "${denied_status}" != "403" ]]; then
  echo "FAIL: session-reset accepted an untrusted Origin (HTTP ${denied_status})" >&2
  exit 1
fi

echo "PASS: frame policy and fail-closed session-reset contract are present; foreign origins are denied."
