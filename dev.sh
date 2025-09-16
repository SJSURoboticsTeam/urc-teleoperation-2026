#!/bin/bash

# Check if --host is in args
USE_HOST=0
for arg in "$@"; do
  if [[ "$arg" == "--host" ]]; then
    USE_HOST=1
    break
  fi
done

# Pass all args to frontend
FRONT_ARGS="$@"

# Run frontend
npm run dev -- $FRONT_ARGS &
FRONT_PID=$!

# Run backend
if [[ $USE_HOST -eq 1 ]]; then
  (cd server && HOST=0.0.0.0 npm start) &
else
  (cd server && npm start) &
fi
BACK_PID=$!

# Handle Ctrl-C
trap "echo 'Stopping...'; kill $FRONT_PID $BACK_PID; exit" INT

# Wait for both to finish
wait $FRONT_PID $BACK_PID
