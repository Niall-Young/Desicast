# Iconcast

公共及团队 SVG 图库，为人和 Agent 提供统一的图标使用入口。

[中文](#中文) | [English](#english)

<a id="中文"></a>
## 中文

### 项目简介

Iconcast 是 macOS Electron 应用，使用 [Gendesign Design System](https://github.com/Niall-Young/Gendesign-Design-system) 的真实组件、Base UI 和 Nico 主题。桌面应用和独立 stdio MCP 共用图库、缓存、搜索与导出核心。

### 核心能力

- 浏览及搜索 Iconify 公共图库，按需获取 SVG，展示来源及许可证。
- 连接公开或私有 GitHub、GitLab、自托管 GitLab HTTPS 仓库，选择分支和 SVG 目录。
- 原子同步团队图标，保留提交 SHA；失败时继续使用上一份缓存。
- 中英文关键词搜索；使用用户配置的多模态模型进行参考图片的相似形状搜索。
- 复制 SVG、HTML、React TSX、Vue SFC，导出 SwiftUI SVG image set 和使用代码。
- 独立 MCP 无需桌面常驻，随安装包提供运行入口，不要求用户安装 Node。

### 快速开始

开发需要 macOS、Node 24+、npm、Git，以及用于 HTTPS Git 集成测试的 OpenSSL。桌面自动化需要可用的 macOS 图形会话。

```sh
npm ci
npm run dev
```

开发模式下修改主进程或共享核心后需重启；界面通过 Vite 热更新。

### 使用方法

1. 在「开源图库」搜索关键词，或在「仓库管理」添加团队仓库。填写 HTTPS URL、分支及仓库内的相对目录；多个目录用英文逗号分隔，`.` 表示整个仓库。
2. 私有仓库填写具有读取权限的访问令牌。GitLab 默认用户名为 `oauth2`，GitHub 可填写账户用户名。
3. 添加仓库后立即同步，应用启动时检查更新，也可手动同步。移除图库只删除本地索引和凭证。
4. 选择图标和技术，复制代码或导出文件。导出会创建新的子目录，不静默覆盖现有资源。
5. React 输出要求 React 18+；Vue 输出要求 Vue 3.5+。SwiftUI 将导出的 `.imageset` 拖入 `Assets.xcassets`，再使用返回的 `Image` 代码。
6. `⌘ K` 聚焦搜索。图片可上传、拖入或粘贴，并在搜索前裁剪。

### 配置

视觉模型使用兼容 OpenAI Chat Completions 的图片输入接口。填写 API 基础地址（通常以 `/v1` 结尾）、模型名称和可选 Key，测试图片能力并确认发送范围。支持 HTTPS 或本机 HTTP 服务。

参考图和允许的候选图标预览会发送到该服务；团队仓库默认禁止模型图片搜索，可按仓库开启。图片限 PNG、JPEG、WebP、8 MB，模型处理限制 1600 万像素。搜索基于关键词召回和视觉排序，不保证找到原图标。

默认数据目录：`~/Library/Application Support/Iconcast`。SQLite 使用 WAL；已缓存图标可离线使用。凭证保存到 macOS Keychain。Git 使用临时、限定仓库主机的凭证助手，不把令牌写入 URL 或普通配置。

`ICONCAST_DATA_DIR` 可指定独立数据目录；MCP 同样支持 `--data-dir`。`ICONCAST_TEST_MODE=1` 仅在未打包桌面开发环境使用内存凭证，并关闭启动时仓库同步，供测试隔离使用。

### 项目结构

- `src/core`：来源、SQLite、Git 同步、SVG 验证、搜索、模型和输出适配。
- `src/electron`：桌面生命周期、受限 IPC、剪贴板和文件导出。
- `src/mcp`：独立 MCP 服务；`src/renderer` 和 `components/ui`：应用界面与 Gendesign 组件。
- `tests`：核心、真实 HTTPS Git 协议和 Electron 交互／导出渲染测试。

上游组件版本及来源见 [GENDESIGN.md](GENDESIGN.md)。项目指令见 [AGENTS.md](AGENTS.md)。

### 开发与验证

```sh
npm run typecheck
npm test
npm run build
npm run test:ui
npm run package
```

打包与桌面自动化按顺序运行。安装包输出到 `release/`，包含当前机器架构的 `.app`、ZIP 和 DMG；当前已验证 Apple Silicon 构建。包未做 Developer ID 签名或公证，供本地使用；不自动对外发布。

已验证：真实 Iconify 搜索、公开 Lucide 仓库同步、私有 GitHub 仓库同步、Keychain 读写、HTTPS 凭证与增改删同步、Electron 明暗主题及复制流程、HTML／React／Vue 实际渲染、独立 MCP 协议和 Codex 实际检索／Vue 获取。

视觉模型测试使用可控服务响应，尚未验证用户的真实模型；本机无完整 Xcode，SwiftUI 目前验证资源结构，未完成 Xcode 编译。GitLab 使用同一 HTTPS Git 路径，尚未验证真实 GitLab 账户。

### API 或 CLI

在应用「MCP 连接」复制适用于当前安装位置的 Codex 命令或通用客户端 JSON。开发时可运行：

```sh
npm run mcp
npm run mcp:dev
```

MCP stdout 仅用于协议消息。可用工具：

| 工具 | 输入与结果 |
| --- | --- |
| `list_sources` | 返回来源、同步状态及数量，不返回凭证 |
| `search_icons` | `query`，可选 `sourceId`、`collection`、`limit`、`offset`；返回精简元数据 |
| `get_icon` | `id`、`target`，可选 `size`、`color`；返回代码、相对路径文件包及来源 |
| `search_icons_by_image` | 绝对 `imagePath`，可选来源过滤；使用已配置模型和发送许可 |
| `sync_repository` | `sourceId`；更新已配置仓库的本地快照 |

`target` 支持 `svg`、`html`、`react`、`vue`、`swiftui`。MCP 不写入用户项目，Agent 自行保存返回的资源。查询工具标记为只读，仓库同步标记为本地状态更新。

视觉搜索可能超过客户端默认工具超时；Codex 可在现有 `[mcp_servers.iconcast]` 节下设置 `tool_timeout_sec = 240`，其他客户端调整相应超时设置。

### 常见问题

- **公共图库断网**：显示匹配的已缓存数据；未获取的图标仍需联网。
- **仓库同步失败**：检查 Git、HTTPS 地址、分支、目录和凭证。首版不处理 SSH 或子模块。
- **部分 SVG 被跳过**：脚本、外部资源、CSS 样式块、滤镜等不支持的结构会被拒绝。常见路径、渐变、裁剪、遮罩、局部引用、内联展示样式和 Figma 图层 ID 可导入；每个 SVG 限 1 MB，每个仓库限 50,000 个已索引图标。
- **搜索结果很多**：公共搜索首版最多返回前 999 项，使用更具体的词或图标集缩小范围；团队图库分页不受此限制。
- **SwiftUI 只复制代码不显示图标**：需要同时导出并导入 SVG image set；不依赖运行时 SVG 字符串解析器。

### 许可证

本项目尚未声明发行许可证。Gendesign 源码由仓库所有者明确授权用于本应用，上游未声明许可证；详见来源记录。公共图标及第三方依赖保留各自许可，Iconify 框架的许可不替代图标集许可。

<a id="english"></a>
## English

### Overview

Iconcast is a macOS Electron application using real components, Base UI primitives, and Nico themes from [Gendesign Design System](https://github.com/Niall-Young/Gendesign-Design-system). The desktop and independent stdio MCP server share the same library, cache, search, and export core.

### Features

- Browse and search public Iconify collections, fetching SVGs on demand with provenance and license information.
- Connect public or private HTTPS GitHub, GitLab, and self-hosted GitLab repositories with branch and SVG directory selection.
- Atomically synchronize team icons with commit SHAs, retaining the previous cache when synchronization fails.
- Search English keywords and common Chinese aliases; find similar shapes using a user-configured multimodal model.
- Copy SVG, HTML, React TSX, and Vue SFC code; export SVG image sets and usage code for SwiftUI.
- Run the bundled independent MCP without the desktop or a separately installed Node runtime.

### Quick Start

Development requires macOS, Node 24+, npm, Git, and OpenSSL for HTTPS Git integration tests. Desktop automation requires an available macOS graphical session.

```sh
npm ci
npm run dev
```

Restart development after main-process or shared-core changes; the renderer uses Vite hot reload.

### Usage

1. Search public collections or add a team source under repository settings. Supply an HTTPS URL, branch, and relative SVG directories; separate directories with commas, or use `.` for the entire repository.
2. Supply a repository-read token for private sources. The GitLab username defaults to `oauth2`; GitHub can use your account username.
3. Sources synchronize immediately after adding and on desktop startup, with manual synchronization available. Removing a source deletes only its local index and credential.
4. Select an icon and target technology, then copy code or export files. Exports create a fresh child directory instead of silently overwriting resources.
5. React output requires React 18+; Vue output requires Vue 3.5+. For SwiftUI, import the exported `.imageset` into `Assets.xcassets`, then use the returned `Image` code.
6. `⌘ K` focuses search. Upload, drop, or paste reference images and crop them before searching.

### Configuration

Vision uses an OpenAI-compatible Chat Completions image-input endpoint. Enter a base API URL (usually ending in `/v1`), model name, and optional key, test image capability, and confirm the sharing scope. HTTPS and local HTTP services are supported.

The reference and permitted candidate previews are sent to that service. Team sources disable vision sharing by default and can enable it individually. Supported references are PNG, JPEG, and WebP up to 8 MB; model processing is limited to 16 million pixels. Keyword retrieval followed by visual ranking does not guarantee an exact match.

Default data directory: `~/Library/Application Support/Iconcast`. SQLite uses WAL, and cached icons work offline. Credentials use macOS Keychain. Git uses a temporary host-scoped credential helper without embedding tokens in URLs or ordinary configuration.

`ICONCAST_DATA_DIR` selects an isolated data directory; MCP also accepts `--data-dir`. `ICONCAST_TEST_MODE=1` uses in-memory desktop credentials and disables startup synchronization only in unpackaged development builds, for test isolation.

### Project Structure

- `src/core`: sources, SQLite, Git synchronization, SVG validation, search, models, and output adapters.
- `src/electron`: desktop lifecycle, restricted IPC, clipboard, and file export.
- `src/mcp`: independent MCP; `src/renderer` and `components/ui`: application UI and Gendesign components.
- `tests`: core, real HTTPS Git protocol, and Electron interaction/export rendering tests.

See [GENDESIGN.md](GENDESIGN.md) for upstream provenance and revision, and [AGENTS.md](AGENTS.md) for project instructions.

### Development and Verification

```sh
npm run typecheck
npm test
npm run build
npm run test:ui
npm run package
```

Run packaging and desktop automation sequentially. `release/` contains an `.app`, ZIP, and DMG for the host architecture; the Apple Silicon build is verified. Packages are not Developer ID signed or notarized and are intended for local use; nothing is published automatically.

Verified: live Iconify search, public Lucide synchronization, private GitHub synchronization, Keychain round trips, HTTPS credentials and add/change/delete synchronization, Electron light/dark themes and copying, actual HTML/React/Vue rendering, independent MCP protocol, and actual Codex search/Vue retrieval.

Vision tests use controlled service responses; the user's real model is unverified. Full Xcode is unavailable locally, so SwiftUI asset structure is verified but Xcode compilation is not. GitLab uses the same HTTPS Git implementation, without a live GitLab account verification.

### API or CLI

Copy the installation-specific Codex command or generic client JSON from MCP settings. During development:

```sh
npm run mcp
npm run mcp:dev
```

MCP stdout contains protocol messages only. Tools:

| Tool | Input and result |
| --- | --- |
| `list_sources` | Sources, synchronization state, and counts without credentials |
| `search_icons` | `query`, optional `sourceId`, `collection`, `limit`, `offset`; compact metadata |
| `get_icon` | `id`, `target`, optional `size`, `color`; code, relative-path resource files, and provenance |
| `search_icons_by_image` | Absolute `imagePath`, optional source filter; configured model and sharing consent required |
| `sync_repository` | `sourceId`; update a configured repository's local snapshot |

Targets: `svg`, `html`, `react`, `vue`, `swiftui`. MCP does not write projects; the Agent saves returned resources. Query tools declare read-only behavior; synchronization declares a local state update.

Vision may exceed a client's default tool timeout. Set `tool_timeout_sec = 240` under an existing `[mcp_servers.iconcast]` section in Codex, or adjust the equivalent setting in other clients.

### Troubleshooting

- **Public API offline:** matching cached data remains available; uncached icons require connectivity.
- **Synchronization fails:** check Git, HTTPS URL, branch, directories, and credentials. SSH and submodules are not supported in this version.
- **Skipped SVGs:** scripts, external resources, CSS style blocks, filters, and other unsupported structures are rejected. Common paths, gradients, clipping, masks, local references, inline presentation styles, and Figma layer IDs are supported. Each SVG is limited to 1 MB and each repository to 50,000 indexed icons.
- **Too many results:** initial public retrieval covers the first 999 results; narrow the keyword or collection. Team pagination is not subject to this limit.
- **SwiftUI code alone shows no icon:** export and import the SVG image set as well; no runtime SVG string parser is used.

### License

No distribution license is declared for Iconcast. The repository owner explicitly authorized using Gendesign in this application; upstream declares no license. See the provenance record. Public icons and dependencies retain their own licenses; the Iconify framework license does not replace collection licenses.
