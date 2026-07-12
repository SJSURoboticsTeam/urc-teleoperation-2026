## Overview
This folder is a collection of the scripts running various services on the Pis.
The extensions ending in .service are systemd files. Systemd is a way of taking programs (bash/python in this case)
and converting them into autostarting services.

## To install:
#### Move files ending in .sh to the regular home directory (~ which is /home/robo)
- Permissions may be required as an executable (sudo chmod +x filename.sh)
- Test them by running like ./filename.sh when in that folder
#### Move files ending in .service into the systemd folder (/etc/systemd/system)
- You will likely need to run this as root with sudo
- To install after being moved: sudo systemctl enable file.service
- To start now : sudo systemctl start file.service
- To stop : sudo systemctl stop file.service
- To see logs : sudo journalctl -u file.service --reverse