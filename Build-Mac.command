#!/bin/bash
cd "$(dirname "$0")"
bash scripts/build-mac.sh
result=$?
if [[ $result -ne 0 ]]; then echo 'The build stopped. The error immediately above explains what needs fixing.'; fi
if [[ -t 0 ]]; then read -r -p 'Press Return to close… ' answer; fi
exit "$result"
