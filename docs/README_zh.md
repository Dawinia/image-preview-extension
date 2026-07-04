# Enhanced Image Previewer

一个轻量的 Chrome Manifest V3 扩展，用于增强网页图片预览体验。

[English](../README.md)

## 功能特点

- 🔍 点击图片即可预览
- 🖱️ 支持鼠标滚轮缩放
- 🎯 支持拖拽移动
- 💫 平滑的动画效果
- 🎨 优雅的加载动画
- 🌐 支持所有网站
- ⌨️ 支持键盘快捷键
- 🎮 支持双击重置
- ⚙️ 可自定义设置
- 🧩 使用 Manifest V3 service worker 处理命令
- 🧱 使用 Shadow DOM 隔离预览 UI
- 🌐 使用 Chrome i18n 支持英文和简体中文

## 安装说明

### 开发版本安装

1. 克隆此仓库

```bash
git clone https://github.com/yourusername/image-preview-extension.git
```

2. 在 Chrome 浏览器中：
   - 访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择克隆下来的项目文件夹

### 从 Chrome 网上应用店安装

_即将上线_

## 使用方法

1. 安装扩展后，访问任意网页
2. 点击任意图片即可进入预览模式
3. 使用鼠标滚轮进行缩放
4. 拖拽图片可以移动位置
5. 点击预览窗口外部区域关闭预览

预览触发会主动避开常见交互元素：

- 小于设置阈值的小图标会被忽略
- 链接、按钮、表单控件、button/link role 内的图片会被忽略
- 设置页可开启 Alt/Option 点击才触发预览

### 快捷键

- `Esc`: 关闭预览
- `+`: 放大图片
- `-`: 缩小图片
- `↑↓←→`: 移动图片
- 双击/0: 重置图片大小和位置

## 开发

### 项目结构

```
├── manifest.json          // MV3 扩展配置
├── popup.html             // 工具栏弹窗外壳
├── options.html           // 设置页外壳
├── src/
│   ├── shared/
│   │   └── core.js        // 设置 schema、工具函数、消息基础能力
│   ├── content/
│   │   ├── previewer.js   // 页面图片预览控制器
│   │   └── previewer.css  // Shadow DOM 预览样式
│   ├── background/
│   │   └── service-worker.js // MV3 后台命令桥接
│   ├── popup/
│   │   └── popup.js       // 弹窗设置逻辑
│   └── options/
│       └── options.js     // 高级设置逻辑
├── scripts/
│   ├── test.mjs           // 共享行为单元测试
│   └── verify.mjs         // manifest、入口路径、语法校验
├── _locales/              // Chrome i18n 文案
├── .github/workflows/     // CI 校验
└── icons/                 // 扩展图标
```

### 功能模块

- **共享核心** (`src/shared/core.js`):
  - 默认设置和设置归一化
  - DOM transform 工具
  - 跨上下文设置读写和活动标签页消息

- **内容脚本预览器** (`src/content/previewer.js`):
  - 图片预览
  - Pointer 拖拽操作
  - 缩放控制
  - 键盘快捷键
  - 加载和错误状态
  - Shadow DOM 隔离
  - 预览对话框打开时的焦点陷阱

- **MV3 Service Worker** (`src/background/service-worker.js`):
  - 初始化持久化设置
  - 处理扩展快捷命令
  - 将命令转发给活动标签页的 content script

- **设置界面** (`src/popup/popup.js`, `src/options/options.js`):
  - 启用/停用图片预览
  - Alt/Option 点击触发模式
  - 最小图片尺寸阈值
  - 背景颜色
  - 背景透明度
  - 最大缩放比例
  - 缩放速度
  - 快捷键开关
  - 双击重置开关

### 本地开发

本扩展刻意保持无构建流程：Chrome 直接加载仓库里的源码。

1. 修改代码后在 `chrome://extensions/` 中点击刷新按钮
2. 运行本地校验：

```bash
npm run check
```

3. 可选：使用支持命令行加载 unpacked extension 的浏览器运行 Chrome smoke test：

```bash
npm run smoke
# 或
CHROME_BIN="/path/to/Chrome for Testing" npm run smoke
```

4. 修改图标需要重新生成 PNG 文件：

```bash
cd icons
rsvg-convert -w 128 -h 128 icon128.svg -o icon128.png
rsvg-convert -w 48 -h 48 icon48.svg -o icon48.png
rsvg-convert -w 16 -h 16 icon16.svg -o icon16.png
```

### 编码规范

- 遵循 Chrome Manifest V3 架构
- 使用静态 content script 注入，后台事件交给 service worker
- 注入页面的 UI 使用 Shadow DOM 隔离
- content、popup、options、background 共享同一套设置 schema
- 扩展页面不使用 inline script
- 使用 ESLint、Prettier、静态 manifest 校验和 CI 做工程守门

## 贡献指南

欢迎提交 Pull Request 和 Issue！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](../LICENSE) 文件了解更多细节
