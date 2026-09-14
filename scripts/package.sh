#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
configuration="${CONFIGURATION:-Release}"
declared_version="$(sed -n 's/^version: "\([^"]*\)"/\1/p' "${project_root}/build.yaml")"
version="${VERSION:-${declared_version}}"
artifact_dir="${project_root}/artifacts"
publish_dir="${artifact_dir}/publish"
archive="${artifact_dir}/Jellyfin.Plugin.StreamystatsIntegration_${version}.zip"

if [[ -z "${version}" ]]; then
  echo "No version found in build.yaml" >&2
  exit 1
fi

mkdir -p "${publish_dir}"
dotnet publish "${project_root}/src/Jellyfin.Plugin.StreamystatsIntegration/Jellyfin.Plugin.StreamystatsIntegration.csproj" \
  --configuration "${configuration}" \
  --output "${publish_dir}" \
  -p:Version="${version}"

pushd "${publish_dir}" >/dev/null
python3 -m zipfile -c "${archive}" "Jellyfin.Plugin.StreamystatsIntegration.dll"
popd >/dev/null
checksum="$(md5sum "${archive}" | awk '{print toupper($1)}')"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%S)"

echo "Artifact: ${archive}"
echo "Manifest checksum: ${checksum}"
echo "UTC timestamp: ${timestamp}"
