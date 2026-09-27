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


echo "PASS: Streamystats may be framed by ${jellyfin_origin} only."
