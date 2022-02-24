#!/usr/bin/env bash

remote="mighty"
dest_path="/opt/app/bot-system-2"
    
rsync -chavzP --include-from exclude-list --delete ./ $remote:$dest_path

#ssh $remote "npm install --production --prefix $dest_path"

#scp env/${a}.env $remote:$dest_path_base/${a}/prod.env
#ssh -t $remote "sudo systemctl restart ${a}"