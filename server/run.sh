source .venv/bin/activate
# needed for autonomy setup
if [ -f "/opt/ros/humble/setup.bash" ]; then
    source /opt/ros/humble/setup.bash
    python3 ./py_server.py "$@" --autonomy
else
    printf "\033[91mNo autonomy source file found at /opt/ros/humble/setup.bash"
    python3 ./py_server.py "$@"
fi

# "$@" passes in all arguments from script to the python server
# ./run.sh --offline --> python3 ./py_server.py --offline