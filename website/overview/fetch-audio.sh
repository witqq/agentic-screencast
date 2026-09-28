#!/bin/sh
# Downloads the music beds that are over 1 MB and therefore not committed. Licences and credits:
# assets/CREDITS.md (Kevin MacLeod, incompetech.com, CC BY 4.0).
set -e
cd "$(dirname "$0")/audio"
curl -fL -o film-bed.mp3 "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Inspired.mp3"
curl -fL -o trailer-bed.mp3 "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Exciting%20Trailer.mp3"
