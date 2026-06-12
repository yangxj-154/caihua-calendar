# 菜花日历 (Calendar PWA) — 开发上下文

## 项目定位
跨平台（Android + Windows）日历/待办 PWA，替代 Outlook日历、日历清单、倒数日 三款应用。

## 当前版本
**standalone-v7** → 已重命名为 `菜花日历.html`

## 技术栈
- 单文件 PWA（HTML + 内联 CSS + 内联 JS）
- Python HTTP Server 本地运行
- localStorage 数据持久化
- 计划接入 Microsoft Graph API（Outlook 同步）

## 已完成功能

### 核心
- [x] 中文自然语言日期解析（明天、下周一、6月13日、17日）
- [x] 时间解析（上午9点、下午3点）
- [x] 循环事件（每天、工作日、每周三、每月15号）
- [x] 倒数日 & 计日器（顶部双栏，按日期排序，3行+滚动）
- [x] 日历网格（事件彩色圆点显示在日期格内）
- [x] 点击日期 → 底部事件列表
- [x] 点击事件 → 弹窗编辑/删除
- [x] 四色分类（红#FF4D4F 黄#FAAD14 蓝#4A90D9 绿#52C41A）
- [x] 添加事件时可设置循环规则
- [x] 导出/导入 JSON

### UI
- [x] 移动端适配（max-width 520px）
- [x] 沾性顶部栏
- [x] 月视图日历导航
- [x] 今天按钮快捷跳转

## 待开发

### 高优先级
- [ ] Outlook Calendar Graph API 同步（个人账号，免费）
- [ ] 微信分享目标 API（从微信接收文本添加事件）

### 中优先级
- [ ] Android 桌面小组件
- [ ] GitHub Pages 部署（永久托管）
- [ ] Service Worker 离线缓存优化
- [ ] 事件搜索

## 文件结构
```
菜花日历.html          ← 主文件，单文件 PWA（当前 v7）
js/
  parser.js            ← 中文自然语言日期/时间/循环解析
  storage.js           ← localStorage CRUD + 导入导出
  app.js               ← v2 版本逻辑（参考用，已被内联代码取代）
css/
  style.css            ← v2 样式（参考用，已被内联样式取代）
icons/
  icon-192.png
  icon-512.png
manifest.json
sw.js
```

## 关键代码模块说明

### parser.js — 中文 NLP 解析器
- 相对日期：明天、后天、大后天、下周X、下下周X
- 绝对日期：X月X日、X月X号
- 独立日号：17日、17号（自动补当月）
- 时间：上午X点、下午X点、X点、X:00
- 循环：每天、工作日、每周X、每X天、每月X号
- 分类检测：关键词映射到四色

### storage.js — 数据层
- events 数组：id, title, date, time, recurring, color, category, createdAt
- milestones 数组：id, title, date, type(countdown/counter)
- exportData() / importData() / downloadBackup()

### 内联代码（在菜花日历.html中）
- 日历渲染：月视图网格、事件点、日期点击
- 事件管理：添加弹窗、编辑弹窗、循环设置
- 倒数日/计日器渲染
- 底部输入栏

## 已知问题 & 修复记录

| 日期 | 问题 | 修复 |
|------|------|------|
| v3→v4 | CSS 不加载（移动端） | CSS 全部内联 |
| v4 | _escHtml 拼写错误 | 修正为 escHtml |
| v5 | "17日 测试" 无法解析 | 添加独立日号正则 |
| v6 | "每周五" 无响应 | 循环事件自动设起始日期 |
| v7 | "下周五" 显示为本周五 | getNextWeekday 逻辑修正 |

## AI 协作规范
- 修改 `菜花日历.html` 前先确认方案
- 每次修改后更新版本号（v8, v9...）
- 保持旧版本备份（standalone-v7.html 等）
- 测试重点：移动端 Safari/Chrome、中文输入解析、循环事件计算
