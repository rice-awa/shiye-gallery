# BUPT V3 — 空间连接

- 原稿：`content/presentations/bupt`，十二页第二版。v3 独立目录，事实、摄影、来源及解说稿沿用。
- Skills：motion-web（内容驱动的轻三维、静帧可读性与性能）、animate（分层入场、打断、减少动态）、context7-mcp（Three.js 当前 API）、playwright-cli（浏览器验收）；发现样式/布局问题时使用 systematic-debugging 定位。
- 渲染层：HTML/CSS 负责全部正文与控件；Three.js WebGL2 负责第 5、6、10 页的说明图。无全文 WebGL、无远程字体或 CDN。
- 保留深海蓝、暖白、青绿和宋体大标题，以少量暖金区分连接端点。
- 构图：首屏保留原版校园摄影；学科页中部双节点群；科研页卫星链路与原新闻图错位叠放，前后两张卡片共享同一展示区域；国际页左侧数字与地球、右侧合作内容。三维图形不覆盖正文。科研新闻照片使用 contain 完整显示，卡片配独立阴影；540ms 侧移与层级交换，前进键先切卡片再翻页；末页“北邮”链接至指定 Bilibili 视频。
- 节奏：页面 480/620ms；离场 280ms；标题 540ms；普通条目 420ms、55ms stagger；图片 640ms；三维相机小角度转入与信号绘制 2200ms、2400ms 停止循环。
- 交互：箭头、空格、目录、重播、全屏、触摸滑动保留；新增 3D 开关。桌面指针只在三维图内产生小角度响应，采用 `1-exp(-12*dt)`，离开后回正。
- 降级：减少动态是完整静帧；触屏不启用指针视角；无 WebGL / 上下文丢失显示本地图示；打印显示静态图。一个 renderer，DPR≤1.5，不渲染阴影或后处理，静止后无持续循环。
- 边界说明：地球轮廓、链路、卫星均为介绍性示意；不新增科研成果、合作伙伴分布等事实。
- 文档：Context7 `/mrdoob/three.js` 的 Rendering on Demand、Responsive Design、Cleanup、BufferGeometry、CatmullRomCurve3。运行库固定 Three.js 0.186.1。

验收证据由 `verify.mjs` 写入 `verification.json`；全部十二页截图与转场中帧位于 `screenshots/`。
