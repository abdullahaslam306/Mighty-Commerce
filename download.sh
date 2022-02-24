#!/usr/bin/env bash

remote="mighty"
dest_path="/opt/app/bot-system-2/temp"
    
rsync -chavzP -va $remote:$dest_path ./download
