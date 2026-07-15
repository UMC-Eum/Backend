#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:?usage: ws-smoke.sh <base-url>}"
ENDPOINT="${BASE_URL%/}/ws/"

open_session() {
  local response
  response=$(curl -fsS --max-time 10 --get "$ENDPOINT" \
    --data-urlencode 'EIO=4' \
    --data-urlencode 'transport=polling')

  if [[ "$response" != 0* ]]; then
    echo "::error::Socket.IO handshake did not return an open packet"
    return 1
  fi

  jq -er '.sid' <<< "${response:1}"
}

poll_session() {
  local sid="$1"
  curl -fsS --max-time 10 --get "$ENDPOINT" \
    --data-urlencode 'EIO=4' \
    --data-urlencode 'transport=polling' \
    --data-urlencode "sid=$sid"
}

connect_namespace() {
  local sid="$1"
  local packet="$2"
  curl -fsS --max-time 10 -X POST "$ENDPOINT?EIO=4&transport=polling&sid=$sid" \
    -H 'Content-Type: text/plain;charset=UTF-8' \
    --data-binary "$packet" > /dev/null
}

UNAUTH_SID=$(open_session)
connect_namespace "$UNAUTH_SID" '40/chats,'
UNAUTH_RESPONSE=$(poll_session "$UNAUTH_SID")
if [[ "$UNAUTH_RESPONSE" != *'44/chats,'* ]] || [[ "$UNAUTH_RESPONSE" != *'"code":"AUTH-001"'* ]]; then
  echo "::error::Unauthenticated /chats connection was not rejected as expected"
  exit 1
fi
echo "WebSocket unauthenticated rejection passed"

if [ -z "${WS_ACCESS_TOKEN:-}" ]; then
  echo "STAGING_WS_ACCESS_TOKEN is not configured; authenticated WebSocket smoke test skipped"
  exit 0
fi

AUTH_SID=$(open_session)
AUTH_PACKET=$(jq -nrc --arg token "$WS_ACCESS_TOKEN" '"40/chats," + ({token:$token} | tojson)')
connect_namespace "$AUTH_SID" "$AUTH_PACKET"
AUTH_RESPONSE=$(poll_session "$AUTH_SID")
if [[ "$AUTH_RESPONSE" != *'40/chats,'* ]]; then
  echo "::error::Authenticated /chats connection failed"
  exit 1
fi
echo "WebSocket authenticated connection passed"
