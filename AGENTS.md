# Agent Notes（htmlppt 画廊）

本文件面向在此仓库工作的 AI agent。交流、说明与文档默认使用中文。

## 画廊封面缩略图（必须提交的产物）

新增作品到画廊时，`assets/thumbs/*.webp` 与 `assets/thumbs/manifest.json` 是**要提交的产物**：Vercel 构建带 `VERCEL` 环境变量，`build.js` 会跳过截图；封面缺失时线上只显示文字占位。

- 构建脚本在本地跑 Playwright 截图（1280×720，等待 1.2s 后抓帧），Vercel 上不跑，所以本地 `npm run build` 生成的封面必须进 git。
- 本地构建后先看一眼生成的 webp。若抓到的帧是淡入黑场、空场景等弱封面（动画短片常见），手动抓一帧替换，再把 manifest 里该路由的 hash 写成源码的 `sourceHash`（两者一致，后续构建才会复用而不重新截图）。
- 抓帧优先用作品自带的钩子：`window.__seek(t)`，或 `?t=<秒>` 的 poster 模式（`body.noui` 可隐藏 UI 提示）；编码沿用 `scripts/screenshots.js` 的 PNG→WebP 路径，保持一致。
- 相关命令：`npm run build`（含截图）、`npm run build:fast`（跳过截图）、`npm run thumbnails`（`--refresh-thumbs` 刷新封面）。
