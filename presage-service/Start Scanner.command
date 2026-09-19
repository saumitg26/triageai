#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi
printf '\nStarting the Presage scanner. Keep this window open while scanning.\n\n'
node server.mjs
printf '\nScanner stopped. Press Return to close.\n'
read
