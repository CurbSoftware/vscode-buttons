#!/usr/bin/env bash
# Build the Buttons vsix, copy it into the local publish directory, and
# attach it to the GitHub release for the version in package.json.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_NAME="vscode-buttons"
DEST="/home/user/projects/published/${REPO_NAME}"
GH_REPO="CurbSoftware/${REPO_NAME}"

cd "$ROOT"

version="$(node -p "require('./package.json').version")"
tag="v${version}"

npm ci
npm run package

shopt -s nullglob
vsix=(release/*.vsix)
shopt -u nullglob
if [[ "${#vsix[@]}" -ne 1 ]]; then
  echo "expected one vsix in release/, found ${#vsix[@]}" >&2
  exit 1
fi

mkdir -p "$DEST"
find "$DEST" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a "${vsix[0]}" "$DEST/"
artifact="$DEST/$(basename "${vsix[0]}")"

if gh release view "$tag" --repo "$GH_REPO" >/dev/null 2>&1; then
  mapfile -t existing < <(gh release view "$tag" --repo "$GH_REPO" --json assets --jq '.assets[].name')
  name="$(basename "$artifact")"
  for have in "${existing[@]+"${existing[@]}"}"; do
    if [[ "$have" == "$name" ]]; then
      echo "release $tag already has $name"
      exit 0
    fi
  done
  gh release upload "$tag" "$artifact" --repo "$GH_REPO"
else
  gh release create "$tag" "$artifact" \
    --repo "$GH_REPO" \
    --target main \
    --title "$tag" \
    --notes "Buttons ${version}."
fi
