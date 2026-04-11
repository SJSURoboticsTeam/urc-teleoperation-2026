source .venv/bin/activate
# "$@" passes in all arguments from script to the python server
# ./run.sh --offline --> python3 ./py_server.py --offline
python3 ./py_server.py "$@"