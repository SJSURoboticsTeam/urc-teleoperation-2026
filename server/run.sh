source .venv/bin/activate
source /opt/ros/humble/setup.bash
# "$@" passes in all arguments from script to the python server
# ./run.sh --offline --> python3 ./py_server.py --offline
python3 ./py_server.py "$@"