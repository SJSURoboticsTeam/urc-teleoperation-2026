#!/bin/bash
#! macos bash script for running frontend and backend concurrently
#! if you are getting permission errors, run `chmod +x dev.sh` in the terminal

# Run frontend
npm run dev &
FRONT_PID=$!

# Run backend in server/
(cd server && npm start) &
BACK_PID=$!

# Handle Ctrl-C
trap "echo 'Stopping...'; kill $FRONT_PID $BACK_PID; exit" INT

# Wait for both to finish
wait $FRONT_PID $BACK_PID
echo "Both processes have finished."