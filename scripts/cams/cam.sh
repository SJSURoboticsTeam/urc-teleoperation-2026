#!/bin/bash

########################################
# Configuration
########################################

PING_IP="192.168.5.2"
PING_RETRY_TIME=5          # seconds

RTSP_PATH="wheels"

WIDTH=1240
HEIGHT=960
FRAMERATE=30
BITRATE=2500000

########################################
# Main Loop
########################################

while true; do
    echo "Checking connectivity to ${PING_IP}..."

    while ! ping -c 1 -W 1 "${PING_IP}" >/dev/null 2>&1; do
        echo "$(date) - ${PING_IP} unreachable. Retrying in ${PING_RETRY_TIME}s..."
        sleep "${PING_RETRY_TIME}"
    done

    echo "$(date) - ${PING_IP} reachable. Starting stream..."

    rpicam-vid \
        --nopreview \
        --timeout 0 \
        --width "${WIDTH}" \
        --height "${HEIGHT}" \
        --framerate "${FRAMERATE}" \
        --codec h264 \
        -b "${BITRATE}" \
        --inline \
        -o - | \
    ffmpeg \
        -fflags nobuffer \
        -flags low_delay \
        -probesize 32 \
        -analyzeduration 0 \
        -i - \
        -c copy \
        -f rtsp \
        -rtsp_transport udp \
        "rtsp://${PING_IP}:8554/${RTSP_PATH}"

    echo "$(date) - Stream stopped. Reconnecting..."
    sleep 2
done
