#!/bin/bash -e
#TODO: this overrides any user setting, it shouldn't
export DATABASE_URL="postgres://docker:docker@$DB_1_PORT_5432_TCP_ADDR:$DB_1_PORT_5432_TCP_PORT/docker"
echo "We are running in $(pwd)"
npm install pg
npm install
supervisor -n exit server.js