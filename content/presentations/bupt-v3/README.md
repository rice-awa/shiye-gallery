# 连接世界，从北邮出发 · 空间连接

在 `../bupt/` 的十二页第二版上增加与内容对应的 Three.js 立体图解，并细化页面过渡。独立作品集地址：`/bupt/`。

双击 `index.html` 即可离线打开。分享时发送整个 `bupt-v3` 文件夹。图片、字体和 Three.js 均本地打包，不依赖 CDN。

## 三维叙事

- 第 1 页：保留原版校园摄影封面，不使用三维效果。
- 第 5 页：两组立体节点由信号路径相连，对应信息网络、计算与安全的学科交叉。
- 第 6 页：太阳能翼卫星与地面双向链路，配合 NTN 低轨卫星语义通信实测；卫星图解与新闻摄影改为两张错位叠放、有阴影的卡片；新闻照片完整等比例显示。
- 第 10 页：以北京为起点的跨地域连接，对应开放合作。连线是介绍性示意，不表示真实伙伴位置或合作线路；地球轮廓为简化示意。

三维场景约 2.4 秒后静止；鼠标在图中移动时有轻微视角响应，移开后回正并停止渲染。底部 **3D** 按钮切换三维 / 静态示意。减少动态模式直接显示完整静帧，不进行视角响应。WebGL 不可用或上下文丢失时显示静态示意，正文和翻页仍可用。打印使用静态示意。

一个 WebGL renderer 在三个场景间复用，DPR 上限 1.5，无后期处理和实时阴影。页面隐藏或目录打开时暂停三维动画。页面离开时清理几何体、材质和 renderer。

## 过渡与操作

页面前后翻转对应不同方向，480–620ms 的短距离位移与淡入；标题、条目、照片分别编排，条目间隔 55ms。快速翻页取消旧动画，并从离场元素的当前姿态继续。既有校史进度线、数字计数及重播保留。

- ← / → / 空格：翻页；手机左右滑动翻页、长页纵向滚动。
- 第六页：第一次前进将新闻卡片从后方切至前方，第二次前进进入第七页；后退先切回图解。从第七页返回时先显示新闻卡片。卡片下方按钮可反复交换前后位置，R 重播会恢复图解在前。目录和页码轨道仍直接跳转。
- R / ↻：重播本页，包括三维信号路径。
- O：目录；F：全屏；Home / End：首末页。
- 第十二页标题中的“北邮”可点击，在新标签页打开指定哔哩哔哩视频。
- [逐页解说稿](解说稿.md)：原十二页讲述结构保留，三维画面作为讲解辅助。

## 源码与验证

`scene-source.js` 是可维护的 Three.js 源码，`scene.js` 是离线 IIFE 构建产物。Three.js **0.186.1**（MIT，许可证见 `assets/THREE-LICENSE.txt`）。无需安装依赖即可播放。

重新打包（在仓库根目录；临时构建依赖不会改变仓库 package.json）：

```sh
npm install --prefix /tmp/bupt-v3-tools --no-audit --no-fund three@0.186.1 esbuild@0.28.2
NODE_PATH=/tmp/bupt-v3-tools/node_modules /tmp/bupt-v3-tools/node_modules/.bin/esbuild content/presentations/bupt-v3/scene-source.js --bundle --minify --format=iife --target=es2020 --outfile=content/presentations/bupt-v3/scene.js
```

浏览器探针：`window.__deck.go(index, instant)`、`replay()`、`hold(milliseconds)`、`settle()`；`window.__spatial.state()` 提供当前场景、绘制调用、三角形数及是否仍在运行。`__deck.hold()` 同步暂停 DOM 与三维动画。

仓库根目录运行 `node reports/bupt-v3/verify.mjs` 可复核桌面、移动端、离线、减少动态、快速翻页、打印及 WebGL 降级。`node reports/bupt-v3/verify-stack.mjs` 检查第六页的分步导航、卡片交换、键盘与移动端布局。

## 内容来源

十二页事实、来源与图片沿用原演示。数据口径截至 2026 年 5 月，科研报道为 2026 年 9 月 28 日，检索日期为 2026 年 10 月 3 日。第十二页列出官方资料，图片出处见 `assets/sources.json`。图片及校标版权归校方或摄影者，本作品为独立介绍，不代表校方。
