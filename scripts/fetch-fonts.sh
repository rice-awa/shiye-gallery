#!/usr/bin/env bash
# 下载首页字体的 OFL 源文件到 .cache/fonts-src（不入库）；子集产物在 assets/fonts 中入库。
set -euo pipefail
cd "$(dirname "$0")/.."
dir=.cache/fonts-src; mkdir -p "$dir"
base=https://raw.githubusercontent.com/google/fonts/main/ofl
proxy=${FONT_PROXY:-${https_proxy:-}}
for item in instrumentserif/InstrumentSerif-Regular.ttf instrumentserif/InstrumentSerif-Italic.ttf 'jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf' 'notoserifsc/NotoSerifSC%5Bwght%5D.ttf'; do
  name=$(basename "$item" | sed 's/%5B/[/;s/%5D/]/')
  [ -s "$dir/$name" ] && { echo "已存在 $name"; continue; }
  curl -fSL --retry 2 ${proxy:+-x "$proxy"} -o "$dir/$name" "$base/$item"
  echo "下载 $name"
done
