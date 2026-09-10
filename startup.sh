#!/bin/sh
# Restart contract: bring up the preview on 0.0.0.0:8080 if it is not healthy.
set -eu
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
cd /workspace
npm run dev > /tmp/uug-dev.log 2>&1 &
# Wait briefly for the listener; don't block the script.
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
    exit 0
  fi
  sleep 1
done
exit 0
