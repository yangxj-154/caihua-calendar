# 菜花日历项目 (calendar-pwa)

## 项目路径
`F:\workbuddy个人文件夹\calendar-pwa\`

## 主文件
`菜花日历.html` — 单文件 PWA，浏览器直接打开

## 启动方式
```bash
cd F:\workbuddy个人文件夹\calendar-pwa
python -m http.server 8006
```
手机访问：`http://<电脑IP>:8006/菜花日历.html`

## 开发上下文
查看同目录下 `project-context.md`

## 开发注意事项
- 修改主文件后更新版本号（内联代码中有版本标记）
- 每次迭代备份旧版本
- 测试移动端显示效果
- 中文日期解析逻辑在 parser.js 中
- 内联 JS 可直接编辑，也可抽出模块化
