# 浏览器依赖

`ml5-0.12.2.min.js` 是用户提供的 Teachable Machine 旧版导出代码所需的固定版本。
现场运行从本地 `/vendor/` 加载，不依赖 unpkg 网络连接。

不要改成 `ml5@latest`：ml5 1.x 对旧 API 有破坏性变更。
