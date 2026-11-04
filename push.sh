#!/bin/sh
# publish the current version from package.json to npm
set -e
cd "$(dirname "$0")"

npm whoami > /dev/null 2>&1 || npm login
npm publish --access public
