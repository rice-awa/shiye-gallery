# 拾页 / HTML Gallery

采用确认原型 A：编辑式画廊。仅浏览、发现和预览，没有上传、提交表单。

- 图标：site/favicon.svg，原创双层纸页，首页使用相同路径。
- 浅色：纸白 #F6F5F0、墨色 #20251F、品牌绿 #52634A、嫩绿 #D8EF7D。
- 深色：森林墨绿 #20251F、表面 #2B3229、文字 #F0F1E9。
- 字体：自托管子集（assets/fonts，OFL）：Shiye Display←Instrument Serif（拉丁展示），Shiye Song←Noto Serif SC（中文标题，按页面实际字符子集化），Shiye Mono←JetBrains Mono（元数据）；正文用系统无衬线。
- 图像：assets/thumbs 中的真实作品截图。
- 版式：12 栏编辑式网格，卡片统一三列等宽；平板两列、手机一列；列表视图为索引表，悬停时封面跟随指针。
- 动效：反馈 160ms、界面 260ms、位移 620ms；缓出 cubic-bezier(.23,1,.32,1)，展开 cubic-bezier(.16,1,.3,1)，弹簧 --spring（ζ≈0.72 的 linear()）。首屏入场 ≤1.2s；预览封面变形、网格⇄列表变形、主题圆形展开用 View Transition，不支持时退回淡入淡出；卡片封面用滚动驱动展开（@supports）。
- 减少动态效果下禁用位移，保留轻微颜色变化，键盘操作即时响应。
- 主题初次跟随系统，手动选择存储在 shiye-theme，首屏绘制前恢复。
