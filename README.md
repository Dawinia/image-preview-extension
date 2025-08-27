# Enhanced Image Previewer

一个简单而强大的 Chrome 扩展，用于增强网页图片预览体验。

## 功能特点

- 🔍 点击图片即可预览
- 🖱️ 支持鼠标滚轮缩放
- 🎯 支持拖拽移动
- 💫 平滑的动画效果
- 🎨 优雅的加载动画
- 🌐 支持所有网站

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
*即将上线*

## 使用方法

1. 安装扩展后，访问任意网页
2. 点击任意图片即可进入预览模式
3. 使用鼠标滚轮进行缩放
4. 拖拽图片可以移动位置
5. 点击预览窗口外部区域关闭预览

## 开发

### 项目结构
```
├── manifest.json    // 扩展配置文件
├── content.js      // 主要功能实现
├── styles.css      // 样式文件
└── icons/          // 扩展图标
```

### 本地开发
1. 修改代码后在 `chrome://extensions/` 中点击刷新按钮
2. 修改图标需要重新生成 PNG 文件：
```bash
cd icons
rsvg-convert -w 128 -h 128 icon128.svg -o icon128.png
rsvg-convert -w 48 -h 48 icon48.svg -o icon48.png
rsvg-convert -w 16 -h 16 icon16.svg -o icon16.png
```

## 贡献指南

欢迎提交 Pull Request 和 Issue！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解更多细节
