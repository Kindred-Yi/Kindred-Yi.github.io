# Kindred Yi · Personal website

一个轻量、可维护的个人学术主页。参考 Shuo Sha 和 Bilge Mutlu 的页面结构重新实现：左侧照片与个人信息、右侧简介与 Research、独立 Blog、统一日间/夜间主题。

## 本地预览

需要 Node.js 22 或更高版本，无需安装任何第三方依赖，无需 Ruby/Jekyll。

```sh
npm run dev
```

打开 http://127.0.0.1:4173 。修改内容后重新运行命令即可更新预览；也可以另开终端执行 `npm run build`，再刷新浏览器。按 Ctrl+C 停止服务。

如果 Windows PowerShell 提示 npm.ps1 被执行策略禁止，请使用 `npm.cmd run dev`、`npm.cmd run build` 和 `npm.cmd run check`，无需更改系统执行策略。

```sh
npm run build
npm run check
```

生成文件位于 `dist/`，不要直接编辑生成文件。检查会验证内部链接、锚点、重复 ID、资源、模板替换和主题切换行为。

## 日常维护

| 想修改什么 | 修改文件 |
| --- | --- |
| 姓名、title、单位、导师、research interests、社交链接 | `content/profile.json` |
| 简介第一、二段的句式和首页结构 | `templates/home.html` |
| 论文标题、作者、状态、摘要、Paper/Code、演示视频 | `content/publications.json` |
| 博客文章目录、标题、发布日期、摘要 | `content/posts.json` |
| 博客文章正文 | `content/posts/<slug>.html` |
| 颜色、字体、间距、移动端布局 | `assets/style.css` |
| 全站导航、页脚、SEO 标签 | `templates/layout.html` |
| 简历 | 替换 `assets/Kindred_CV.pdf` |
| 照片 | 替换 `images/yyzava.png`，或修改 profile.json 中的 photo |

不使用外部字体、图标服务、jQuery、CSS 框架或客户端路由。文字内容和博客链接在构建时生成，不依赖浏览器 JavaScript。唯一的浏览器脚本是主题切换；即使禁用 JavaScript，系统主题样式和主要内容仍可使用。主题选择通过 localStorage 跨页面保存，系统偏好作为初始默认值。

## 新增论文

复制 `content/publications.json` 中的一项，更新字段即可。列表按文件中的顺序显示；建议最新在前。不需要视频时删除 `video` 字段；没有的 Paper/Code 链接可以不写，不要填 `#`。

当前三篇论文的标题、作者顺序和投稿/展示状态依据最新的 `Kindred_CV_research.pdf`。Paper、Code、Video、Poster 和 Manuscript 链接从该 CV 的链接注释提取，内嵌演示视频沿用仓库原文件。第三篇论文在 CV 中没有提供链接，因此不显示虚构的按钮。可选 `presentation` 字段用于区分海报展示和期刊/会议投稿。旧模板的四篇示例论文已删除。

## 发布第一篇博客

1. 复制 `content/posts/_template.html` 为 `content/posts/my-first-post.html`。
2. 用简单 HTML 编写正文，例如 `<p>`、`<h2>`、`<a>`、`<img>`、`<pre><code>`。
3. 把下面的条目加入 `content/posts.json` 的数组中：

```json
[
  {
    "slug": "my-first-post",
    "title": "My first post",
    "date": "2026-10-17",
    "description": "A short summary of the post.",
    "draft": false
  }
]
```

4. 运行 `npm run build` 和 `npm run check`。

文章 URL 为 `/blog/my-first-post/`。`slug` 只能包含小写字母、数字和连字符，并且必须与正文文件名对应。`draft: true` 的文章不会进入构建结果或 sitemap。列表自动按日期从新到旧排列。正文为你自己维护的可信 HTML，不会执行 Markdown 转换；没有引入额外编辑器或解析依赖。

模板文件不会被发布。当前没有编造任何博客文章，Blog 显示清晰的空状态。

## 链接、占位和需要确认的内容

已接入真实链接：CV、Google Scholar、LinkedIn、Email、Twitter/X、GitHub，以及 Andreea Bobu、Bilge Mutlu 和 Mike Hagenow 的个人主页。

- **目前没有需要补齐的社交链接占位。** 邮箱仍使用旧仓库中的 `yyi49@wisc.edu`。如果你希望使用 MIT 邮箱，修改 `content/profile.json` 的 `links.email`。
- **CV 已替换为你提供的最新 `Kindred_CV_research.pdf`，下载地址保持 `/assets/Kindred_CV.pdf`。** PDF 文件原样复制，没有修改内容。
- **论文状态以最新 CV 为准。** 第一篇为 IROS 2026 Workshop 海报展示、ICRA 2027 在投；第二篇为 RA-L 在投；第三篇为 HRI 2027 在投。没有将投稿写成录用。
- **title 暂用你描述的通用 `Researcher`。** 如需正式职位名称，可直接修改 profile.json 的 `title`。
- 本科经历和导师以最新 CV 为准：UW–Madison 的 B.S. in Computer Science，2026 年 5 月毕业；Bilge Mutlu 和 Mike Hagenow。MIT CSAIL 和 Andreea Bobu 的当前研究关系来自你在本次对话中明确提供的信息，最新 CV 尚未列出该段经历。
- 唯一的写作占位是 `content/posts/_template.html`，其中的 example.com 和示例文字不进入网站。
- 社交链接若以后设为 `null`，对应图标会显示为不可点击的灰色状态；发布前检查会提醒补齐。

## GitHub Pages 部署

这个仓库继续使用 GitHub Pages，不创建其他托管平台的站点。

1. 在 GitHub 仓库打开 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**（首次切换时设置一次）。
2. 提交并推送修改到 `master` 或 `main`。
3. `.github/workflows/pages.yml` 会生成网站、检查链接并部署 `dist/`。也可在 Actions 页面手动运行该 workflow。

目标域名为 https://kindred-yi.github.io/ 。旧 `/publications/` 和 `/about/` 地址会跳转到对应首页区域。其他旧模板演示页面已经移除，访问不存在的页面将显示新的 404 页面。

构建脚本仅将 assets、images 和生成的 HTML 复制到 dist；内容源文件和写作模板不会被发布。GitHub Actions 的部署方式参考 [GitHub 官方静态页面 workflow](https://github.com/actions/starter-workflows/blob/main/pages/static.yml)。本次仅修改本地仓库，没有执行 git commit、push 或线上部署。

## 文件结构

```text
content/          个人资料、论文、博客目录与正文
  posts/          博客 HTML 正文（_template.html 不发布）
templates/        全站布局和首页结构
assets/           全站样式、主题脚本、PDF、研究视频
images/           保留的个人照片
scripts/          静态生成、本地预览、检查
.github/workflows/pages.yml
```

旧 Academic Pages 的模板、Sass、插件、示例论文/博客/教学/演讲内容、地图和自动生成 notebooks 已清理。保留原 LICENSE；旧版本仍可通过 Git 历史恢复。`assets/CV.pdf` 是最新 CV 的兼容副本，避免旧下载地址提供过时信息；另外两张个人照片保留为原始资料备份，当前页面不引用它们。以后更新 CV 时，请同步替换两个 PDF 文件。

## 本次验证范围

构建、内部链接/锚点/资源、主题逻辑、博客生成及草稿过滤、无效文章拒绝、HTTP 页面和视频范围请求均可在本地验证。当前会话没有可用浏览器，因此没有完成真实浏览器截图、移动端视觉或键盘交互验收；发布前建议在浏览器检查首页和 Blog 的浅色/深色与手机宽度。
