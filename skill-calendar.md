# 菜花日历开发助手

## 触发方式
`@skill:calendar` 或提及「菜花日历」「日历PWA」

## 项目信息
- 路径：`F:\workbuddy个人文件夹\calendar-pwa\`
- 主文件：`菜花日历.html`
- 上下文文档：`project-context.md`

## 能力范围
- 修改/迭代 菜花日历.html（单文件 PWA）
- 调试中文 NLP 日期解析逻辑
- 新增功能：Outlook 同步、微信分享、桌面小组件
- 测试移动端效果
- 版本管理（备份旧版，更新版本号）

## 开发规范
1. 修改前先提方案，用户确认后再执行
2. 每次修改更新版本标记（v7→v8→v9...）
3. 保留旧版本备份文件
4. 修改后告知测试重点
5. 涉及 parser.js/storage.js 时同步更新内联代码

## 当前版本
v7（2026-06-11）

## 启动命令
```powershell
cd F:\workbuddy个人文件夹\calendar-pwa
python -m http.server 8006
```
