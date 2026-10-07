#!/usr/bin/env bash
# Downloads the MLB and NFL raw game data the pipeline needs (NBA/NHL tables are already in data/).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p raw
if [ ! -d raw/retrosheet ]; then
  git clone --depth 1 --filter=blob:none --no-checkout https://github.com/chadwickbureau/retrosheet raw/retrosheet
  git -C raw/retrosheet sparse-checkout set --no-cone 'seasons/*/GL*' 'seasons/*/gl*' 'gamelog/GL*'
  git -C raw/retrosheet checkout
fi
curl -sSfL -o raw/games.csv https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv
curl -sSfL -o raw/nfl_games.csv https://raw.githubusercontent.com/fivethirtyeight/nfl-elo-game/master/data/nfl_games.csv
echo "raw data ready"
