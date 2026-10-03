<a id="readme-top"></a>

[中文](#中文) | [English](#english)

<div align="center">

  <img src="./assets/icon.png" width="112" height="112" alt="DesiCast Logo" />

  <h1>DesiCast</h1>

  <p>
    <strong>公共及团队 SVG 图库，为人和 AI Agent 提供统一的图标使用入口</strong>
    <br />
    <em>Public & team SVG icon library for humans and AI agents.</em>
  </p>

  <p>
    <a href="https://github.com/Niall-Young/Iconcast"><img src="https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)-000000?style=flat-square&logo=apple&logoColor=white" alt="Platform: macOS" /></a>
    <img src="https://img.shields.io/badge/Electron-44.5-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron: 44.5" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D24-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node: >=24" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript: 5.9" />
    <img src="https://img.shields.io/badge/Protocol-MCP%20Server-8A2BE2?style=flat-square" alt="MCP Server" />
    <img src="https://img.shields.io/badge/Design%20System-Gendesign-111111?style=flat-square" alt="Gendesign" />
  </p>

  <p>
    <img src="https://img.shields.io/badge/Export-React%2019-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Export-Vue%203.5-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue 3.5" />
    <img src="https://img.shields.io/badge/Export-SwiftUI-F05138?style=flat-square&logo=swift&logoColor=white" alt="SwiftUI" />
    <img src="https://img.shields.io/badge/Storage-SQLite%20WAL-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite WAL" />
    <img src="https://img.shields.io/badge/Security-macOS%20Keychain-555555?style=flat-square&logo=apple&logoColor=white" alt="macOS Keychain" />
  </p>

  <p>
    <b><a href="#-简体中文">简体中文</a></b>
    &nbsp; • &nbsp;
    <b><a href="#-english">English</a></b>
  </p>

</div>

---

<a id="-简体中文"></a>
<a id="中文"></a>
<a id="zh-cn"></a>

## 中文

> 🌐 **语言切换 / Language**: [English Version](#-english) &nbsp;|&nbsp; [回到顶部 / Back to Top](#readme-top)

### 项目简介

DesiCast 是 macOS Electron 应用，使用 [Gendesign Design System](https://github.com/Niall-Young/Gendesign-Design-system) 的真实组件、Base UI 和 Nico 主题。桌面应用和独立 stdio MCP 共用图库、缓存、搜索与导出核心。

品牌标识为浅色玻璃底板上的紫色小恶魔。`assets/Desicast.icon` 保存 Icon Composer 分层源文件，主体与五官使用独立 SVG 图层；`assets/icon.svg` 保留矢量预览。运行 `npm run icon:generate` 使用 Xcode 内置的 Icon Composer 渲染工具生成 PNG 和 ICNS，并在 1024px 画布中添加每边 96px 的透明留边。该命令需要安装包含 Icon Composer 的 Xcode；可通过 `ICON_COMPOSER_TOOL` 指定 `ictool` 路径。Electron 当前使用静态玻璃渲染，不随系统光照动态变化。桌面名称为 DesiCast，包名和 MCP 注册名为 `desicast`。默认数据目录、SQLite 文件名与 Keychain 服务名也已更名；不会自动迁移旧 Iconcast 数据或凭据，已有 MCP 客户端需重新注册。

### 核心能力

- **公共图库检索**：浏览及搜索 Iconify 公共图库，按需获取 SVG，展示来源及许可证。
- **团队私有同步**：连接公开或私有 GitHub、GitLab、自托管 GitLab HTTPS 仓库，按需选择分支和 SVG 目录。
- **原子增量快照**：原子同步团队图标并保留提交 SHA；同步失败时自动继续使用上一份安全缓存。
- **双模搜索**：中英文关键词搜索；可使用用户配置的多模态模型进行参考图片的相似形状搜索。
- **多技术导出**：一键复制 SVG、HTML、React TSX、Vue SFC 代码，导出 SwiftUI SVG image set 及配套调用代码。
- **独立 MCP 服务**：随安装包内置运行入口，无需常驻 Electron 桌面，且无需终端用户配置独立 Node 环境。

默认快捷入口包括 Lucide、Tabler Icons、Remix Icon、Unicons、MingCute、Google Material Icons 和 Eva Icons。侧栏显示公共目录的实际图标总数（不是下载缓存数量），团队库显示成功索引的 SVG 数量。公共目录每天缓存、每小时自动检查，并可使用「刷新图库」立即检查；团队库同步后记录新增、SVG 更新和删除。公共库徽标提示目录数量、可用版本及 API 最后修改时间变化；旧缓存会按需更新，网络失败时仍保留旧 SVG；徽标跨重启保留，可在图库内「标记已读」。默认库支持无关键词分页浏览。侧栏「图库选项」提供仓库类型、状态与排序，默认均不勾选；类型和状态支持多选，组内取并集、组间取交集。名称与添加时间排序按选择顺序组合，同一项正序与倒序互斥，再次点击可取消；未选择时保留原有顺序。旧仓库缺少添加时间时使用既有顺序，新增仓库记录添加时间。

右键侧栏或首页中的任意图标库，可打开、置顶/取消置顶、配置、查看来源或移除。置顶状态和公共图库的显示名称保存在本机，置顶优先于侧栏排序。团队图库配置直接打开该仓库的编辑表单；公共图库配置可修改显示名称。移除须确认：公共图库从导航中隐藏，可在“添加图标库”弹窗重新添加，仍可通过全局搜索和 MCP 获取；团队仓库会删除本地索引和凭证，不修改远端仓库。

首页、侧栏、图标网格和详情面板按用户的 Figma 设计还原，图库标识与控件 SVG 随应用打包；设计节点、尺寸与校验值见 [设计素材来源记录](src/renderer/design-assets/provenance.json)，原始品牌来源见 [来源记录](src/renderer/library-marks/provenance.json)。Lucide 保留官方深色版本，其余品牌保留设计原色。Unicons 使用用户提供图片的矢量重建版本，并非官方原始 SVG。品牌归各自所有者，图标许可不代表品牌使用授权。

### 快速开始

开发需要 macOS、Node 24+、npm、Git，以及用于 HTTPS Git 集成测试的 OpenSSL。桌面自动化需要可用的 macOS 图形会话。

```sh
npm ci
npm run dev
```

开发模式下修改主进程或共享核心后需重启；界面通过 Vite 热更新。

### 使用方法

图标页面支持网格/列表切换，点击图标打开独立详情面板，顶部代码按钮可收起详情。搜索选项保留以图搜图与刷新入口；详情可复制名称、切换导出格式和导出文件，单色图标默认跟随使用处的颜色，尺寸在项目中调整；来源与许可保留在复制的代码和导出的资源中。

1. **查找图标**：在首页或侧栏选择图库，或使用「全局搜索」。点击「添加图标库」打开 640px 弹窗连接团队仓库，名称最多 20 个字符；侧栏底部设置菜单保留仓库管理、视觉模型与外观入口，MCP 标签打开连接设置。填写 HTTPS URL，离开链接输入框后自动读取仓库信息，也可手动重试，然后下拉选择分支，通过多选级联目录选择器选择 SVG 目录或整个仓库。
2. **凭据配置**：可填写用户名与访问令牌连接私有仓库，令牌默认隐藏并在添加后保存至 Keychain；留空时自动复用本机 Git 凭据或已登录的 `gh` / `glab`。编辑时令牌留空保留已有凭据，视觉检索由弹窗底部开关控制，默认关闭。
3. **图库同步**：添加仓库后立即同步，应用启动时检查更新，也可手动同步。移除图库只删除本地索引和凭据。
4. **复制代码与导出**：选择图标和目标技术，复制代码或导出文件。导出会创建新的子目录，不静默覆盖现有资源。
5. **多端集成**：React 输出要求 React 18+；Vue 输出要求 Vue 3.5+。SwiftUI 将导出的 `.imageset` 拖入 `Assets.xcassets`，再使用返回的 `Image` 代码。
6. **视觉搜索与快捷键**：<kbd>⌘</kbd> + <kbd>K</kbd> 聚焦搜索。图片支持上传、拖入或剪贴板粘贴，并在搜索前交互式裁剪。

### 配置说明

视觉模型使用兼容 OpenAI Chat Completions 的图片输入接口。填写 API 基础地址（通常以 `/v1` 结尾）、模型名称和可选 Key，测试图片能力并确认发送范围。支持 HTTPS 或本机 HTTP 服务。

参考图和允许的候选图标预览会发送到该服务；团队仓库默认禁止模型图片搜索，可按仓库单独开启。图片限 PNG、JPEG、WebP 格式（最大 8 MB），模型处理上限 1600 万像素。搜索基于关键词召回和视觉排序，不保证找到原图标。

默认数据目录为 `~/Library/Application Support/DesiCast`。SQLite 启用 WAL 模式；已缓存图标可完全离线使用。凭据严格安全保存在 macOS Keychain 中。Git 使用临时、限定仓库主机的凭据助手，严禁将令牌写入 URL 或普通配置文件。

- `DESICAST_DATA_DIR`：指定独立数据目录；独立 MCP 同样支持 `--data-dir`。
- `DESICAST_TEST_MODE=1`：仅在未打包桌面开发环境使用内存凭据，并关闭启动时仓库同步，供测试隔离使用。

### 项目结构

```text
├── src/
│   ├── core/       # 图标来源、SQLite、Git 同步、SVG 验证、搜索、模型与输出适配核心
│   ├── electron/   # 桌面生命周期、受限 IPC 通信、剪贴板与文件导出实现
│   ├── mcp/        # 独立 stdio MCP 服务入口
│   └── renderer/   # 应用界面、页面状态与 Gendesign 组件消费
├── components/ui/  # Gendesign 基础设计系统组件
├── tests/          # 核心、真实 HTTPS Git 协议和 Electron 交互与导出渲染测试
└── assets/         # 原生应用图标及图形资源
```

上游组件版本及来源见 [GENDESIGN.md](GENDESIGN.md)。项目详细指引见 [AGENTS.md](AGENTS.md)。

### 开发与验证

```sh
npm run typecheck    # 静态类型检查
npm test             # 核心逻辑与集成测试
npm run build        # 构建共享核心、主进程与渲染器
npm run test:ui      # Playwright 桌面 UI 自动化测试
npm run package      # 生成 macOS DMG / ZIP 安装包
```

打包与桌面自动化测试需按顺序运行。安装包输出到 `release/`，包含当前机器架构的 `.app`、ZIP 和 DMG；当前已通过 Apple Silicon 构建验证。安装包未做 Developer ID 签名或公证，供本地与团队内部使用；不自动对外发布。

已验证矩阵：真实 Iconify 搜索、公开 Lucide 仓库同步、私有 GitHub 仓库同步、Keychain 读写、HTTPS 凭据与增改删同步、Electron 明暗主题及复制流程、HTML／React／Vue 实际渲染、独立 MCP 协议和 Codex 实际检索／Vue 获取。

视觉模型测试使用受控服务响应，尚未验证用户的真实模型；本机无完整 Xcode，SwiftUI 目前验证资源结构，未完成 Xcode 编译。GitLab 使用同一 HTTPS Git 路径，尚未验证真实 GitLab 账户。

### MCP 服务与 CLI

点击侧栏底部 MCP 标签打开「MCP 配置」弹窗，在 ChatGPT（Codex）、Claude code 和其他页签中切换并复制适用于当前安装位置的 Codex、Claude Code 注册命令或其他客户端的通用 JSON。Claude Code 命令使用 `--transport stdio --scope user`，让当前用户的所有项目都能使用 DesiCast；执行后在新的 Claude Code 会话中输入 `/mcp` 查看连接状态。命令会自动携带图库数据目录，开发模式也会包含所需的 Electron 环境变量。开发时可直接运行：

```sh
npm run mcp        # 运行构建产物
npm run mcp:dev    # 使用 tsx 热运行 MCP 服务
```

MCP stdout 仅用于标准 JSON-RPC 协议消息。可用工具列表：

| 工具名称                | 输入与结果描述                                                                  |
| ----------------------- | ------------------------------------------------------------------------------- |
| `list_sources`          | 返回来源列表、同步状态及图标数量，不暴露凭据                                    |
| `search_icons`          | 参数：`query`，可选 `sourceId`、`collection`、`limit`、`offset`；返回精简元数据 |
| `get_icon`              | 参数：`id`、`target`，可选 `size`、`color`；返回使用代码、相对路径文件包及来源  |
| `search_icons_by_image` | 参数：绝对路径 `imagePath`，可选来源过滤；需已配置视觉模型和发送许可            |
| `sync_repository`       | 参数：`sourceId`；触发更新已配置仓库的本地快照                                  |

`target` 支持 `svg`、`html`、`react`、`vue`、`swiftui`。MCP 不直接写入用户项目目录，由 Agent 自行持久化返回的代码与资源。查询工具声明为只读（read-only），仓库同步标记为本地状态更新。

视觉搜索可能超出部分客户端的默认超时阈值；Codex 建议在现有 `[mcp_servers.desicast]` 节下增加 `tool_timeout_sec = 240`，其他客户端请相应调整工具调用超时。

### 常见问题

- **公共图库网络中断**：本地已缓存的数据仍可正常搜索与浏览；尚未拉取的图标需要恢复联网。
- **仓库同步失败**：检查本地 Git、网络、HTTPS 地址、分支名、目录路径及访问令牌。首版暂不支持 SSH 协议或 Git Submodules。
- **部分 SVG 无法导入**：脚本、外部资源引用、CSS 样式块、滤镜等不安全或不支持的结构会被严格拦截。常规路径、渐变、裁剪、遮罩、局部引用、内联展示样式和 Figma 图层 ID 均可正常导入；单个 SVG 限制 1 MB，每个仓库上限 50,000 个已索引图标。
- **搜索结果过多**：公共图库首版限制返回前 999 条结果，可通过追加关键词或指定图标集缩小范围；团队私有图库分页不受此限制。
- **SwiftUI 复制代码后不显示**：需同时导出并将 `.imageset` 导入到 Xcode 的 `Assets.xcassets` 中；本实现采用资产规范，不依赖运行时 SVG 字符串解析器。

### 许可证

本项目尚未声明开源发行许可证。Gendesign 源码由仓库所有者明确授权用于本应用，上游未声明许可证；详见来源记录。公共图标及第三方依赖保留各自独立许可，Iconify 框架的许可不替代具体图标集的许可证。

<p align="right"><a href="#readme-top">↑ 回到顶部</a></p>

---

<a id="-english"></a>
<a id="english"></a>
<a id="en"></a>

## English

> 🌐 **Language / 语言切换**: [简体中文](#-简体中文) &nbsp;|&nbsp; [Back to Top / 回到顶部](#readme-top)

### Overview

DesiCast is a native macOS Electron application built with real components, Base UI primitives, and Nico themes from the [Gendesign Design System](https://github.com/Niall-Young/Gendesign-Design-system). The desktop application and the standalone stdio MCP server share the same library, cache, search, and export core.

The DesiCast mark is a purple little devil on a light glass tile. `assets/Desicast.icon` stores the layered Icon Composer source, with separate SVG layers for the body and face; `assets/icon.svg` retains a vector preview. Run `npm run icon:generate` to render PNG and ICNS using Xcode’s Icon Composer tool, adding 96px transparent margins on each side of a 1024px canvas. This command requires Xcode with Icon Composer; set `ICON_COMPOSER_TOOL` to override the `ictool` path. Electron currently uses a static glass render that does not respond dynamically to system lighting. The desktop name is DesiCast, and the package and MCP registration name is `desicast`. The default data directory, SQLite filename, and Keychain service name have also changed. Existing Iconcast data and credentials are not migrated automatically; existing MCP clients need to be registered again.

### Features

- **Public Icon Collections**: Browse and search public Iconify collections, fetching SVGs on demand with complete provenance and license metadata.
- **Team Repositories**: Connect public or private HTTPS GitHub, GitLab, and self-hosted GitLab repositories with branch and SVG directory selection.
- **Atomic Synchronization**: Synchronize team icons atomically with commit SHA tracking, cleanly retaining previous cache data when synchronization fails.
- **Dual-Mode Search**: Bilingual keyword search (English and Chinese aliases) alongside visual shape similarity search powered by user-configured multimodal models.
- **Multi-Framework Exports**: One-click code copying for SVG, HTML, React TSX, and Vue SFC; full asset set export with usage code for SwiftUI.
- **Standalone MCP Server**: Bundled runtime executable requiring no desktop window presence and no user-installed Node environment.

Default shortcuts include Lucide, Tabler Icons, Remix Icon, Unicons, MingCute, Google Material Icons, and Eva Icons. Public sidebar counts use catalog totals rather than downloaded cache counts; team counts reflect successfully indexed SVGs. The public catalog is cached daily, checked hourly, and can be checked immediately with “Refresh library”. Team synchronization records additions, SVG changes, and deletions. Public badges indicate catalog count, published version, and API modification-time changes where available. Cached SVGs refresh on demand while remaining available if the network fails. Unread badges persist across restarts and can be marked as read within the library. Default collections support paginated browsing without a keyword. Sidebar “Library options” provides type, status, and sorting controls, all initially unchecked. Types and statuses support multiple selections: matches are combined within a group and intersected across groups. Name and creation-time sorting combine in selection order; opposite directions for the same criterion are mutually exclusive, and clicking again clears it. Without sorting, the original order is retained. Older repositories without creation timestamps fall back to their existing order; new repositories record creation time.

Right-click any library in the sidebar or home screen to open it, pin/unpin it, configure it, view its source, or remove it. Pinning and public-library display names persist locally; pinned libraries precede sidebar sorting. Team configuration opens that repository’s edit form; public configuration changes its display name. Removal requires confirmation: public libraries are hidden from navigation and can be re-added from the “Add Library” modal, while remaining available to global search and MCP; removing a team repository deletes its local index and credentials without changing the remote repository.

The home screen, sidebar, icon grid, and detail panel follow the user's Figma design, with library marks and control SVGs bundled locally. [Design asset provenance](src/renderer/design-assets/provenance.json) records nodes, dimensions, and checksums; [original brand sources](src/renderer/library-marks/provenance.json) remain available. Lucide retains its official dark variant; other brands retain the design's colors. Unicons uses a vector reconstruction of the user-supplied image, not an official original SVG. Brands belong to their respective owners; icon licenses do not grant brand usage rights.

### Quick Start

Development requires macOS, Node 24+, npm, Git, and OpenSSL for HTTPS Git integration tests. Desktop automation requires an active macOS graphical window session.

```sh
npm ci
npm run dev
```

Restart the development server after modifying the main process or shared core; the renderer UI updates via Vite hot module replacement (HMR).

### Usage

The icon workspace supports grid and list views. Select an icon to open its separate detail panel, and use the code button in the title bar to collapse it. Search options include image search and refresh. Details provide name copying, export format tabs, and file export. Monochrome icons inherit the color at their point of use, and size is adjusted in the project. Copied code and exported resources retain source and license information.

1. **Discover Icons**: Choose a library on the home screen or sidebar, or use "Global Search". Use "Add Library" to open a 640px modal and connect a team repository; names allow up to 20 characters. The bottom settings menu retains repository management, vision model, and appearance options; the MCP badge opens connection settings. Enter the HTTPS URL; repository information loads when the link field loses focus and can be retried manually. Then choose a branch from the dropdown and SVG directories (or the entire repository) using the multiselect cascader.
2. **Configure Credentials**: Enter a username and access token for private repositories; tokens are masked by default and saved in Keychain after adding the library. Empty fields reuse local Git credentials or an authenticated `gh` / `glab` session. Leaving the token blank while editing preserves existing credentials. The footer controls vision search, which is disabled by default.
3. **Synchronize Libraries**: Repositories synchronize immediately upon addition and check for updates on desktop launch. Manual synchronization is always available. Removing a source deletes only local cache indexes and credentials.
4. **Copy & Export**: Select an icon and target technology, then copy code or export files. File exports create dedicated subdirectories to avoid silent overwrites.
5. **Multi-Target Integration**: React output targets React 18+; Vue output targets Vue 3.5+. For SwiftUI, drag the exported `.imageset` into `Assets.xcassets`, then use the generated `Image` code.
6. **Visual Search & Shortcuts**: Press <kbd>⌘</kbd> + <kbd>K</kbd> to focus the search bar. Reference images can be uploaded, dragged, or pasted from the clipboard, with interactive cropping before search.

### Configuration

Vision similarity search connects to OpenAI-compatible Chat Completions endpoints supporting image inputs. Provide the API base URL (typically ending in `/v1`), model name, and optional API key, then verify connectivity and confirm data-sharing scope. Both HTTPS and local HTTP services are supported.

Reference images and permitted candidate previews are transmitted to the configured endpoint. Team repositories disable vision data sharing by default and can be opted-in per repository. Reference images accept PNG, JPEG, and WebP (up to 8 MB), with model processing capped at 16 megapixels. Keyword retrieval followed by visual ranking does not guarantee finding exact original icons.

Default data directory is `~/Library/Application Support/DesiCast`. SQLite operates in WAL mode; cached icons are fully accessible offline. Credentials are encrypted in macOS Keychain. Git uses an ephemeral, host-scoped credential helper without persisting tokens to URLs or ordinary configuration files.

- `DESICAST_DATA_DIR`: Overrides the data directory path; standalone MCP also supports `--data-dir`.
- `DESICAST_TEST_MODE=1`: Uses in-memory credential storage and skips startup synchronization in unpackaged dev mode for testing isolation.

### Project Structure

```text
├── src/
│   ├── core/       # Sources, SQLite, Git sync, SVG validation, search, vision, and output adapters
│   ├── electron/   # Electron lifecycle, secure IPC, clipboard, and file export implementations
│   ├── mcp/        # Standalone stdio MCP server entrypoint
│   └── renderer/   # Application UI, state management, and Gendesign components
├── components/ui/  # Gendesign design system component implementations
├── tests/          # Core tests, real HTTPS Git integration tests, and Playwright UI tests
└── assets/         # Native app icon and artwork resources
```

See [GENDESIGN.md](GENDESIGN.md) for design system provenance, and [AGENTS.md](AGENTS.md) for AI and development instructions.

### Development and Verification

```sh
npm run typecheck    # Static TypeScript type check
npm test             # Core logic and integration tests
npm run build        # Build core, Electron main, and renderer bundles
npm run test:ui      # Playwright desktop UI automation tests
npm run package      # Create local macOS DMG and ZIP packages
```

Run packaging and desktop automation sequentially. Packaged artifacts are saved to `release/`, containing `.app`, ZIP, and DMG bundles for the host architecture (verified on Apple Silicon). Bundles are not Developer ID signed or notarized and are intended for local and internal use.

Verified matrix: live Iconify search, public Lucide repository synchronization, private GitHub synchronization, Keychain storage round-trips, HTTPS credentials with CRUD sync, Electron light/dark themes, clipboard copy workflows, real HTML/React/Vue DOM rendering, standalone MCP protocol, and Codex retrieval of Vue components.

Vision similarity tests use controlled mock responses; user-configured models are verified at runtime. Without a full local Xcode installation, SwiftUI tests validate directory and catalog structures rather than Xcode builds. GitLab shares the HTTPS Git pipeline and has not been tested against a live GitLab enterprise instance.

### MCP Server & CLI

Click the MCP badge at the bottom of the sidebar to open the "MCP Configuration" modal. Switch between ChatGPT (Codex), Claude code, and Other to copy the installation-specific registration command for Codex or Claude Code, or generic JSON for other clients. The Claude Code command uses `--transport stdio --scope user` to make DesiCast available across the current user's projects; after running it, enter `/mcp` in a new Claude Code session to check the connection. Commands include the library data directory and, in development, the required Electron environment variable. For development:

```sh
npm run mcp        # Run compiled MCP server
npm run mcp:dev    # Run MCP server directly with tsx
```

MCP stdout is strictly reserved for JSON-RPC protocol communications. Available tools:

| Tool Name               | Input Parameters & Output Description                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `list_sources`          | Lists configured sources, synchronization status, and icon counts without credentials                  |
| `search_icons`          | `query`, optional `sourceId`, `collection`, `limit`, `offset`; returns compact metadata                |
| `get_icon`              | `id`, `target`, optional `size`, `color`; returns generated code, relative asset files, and provenance |
| `search_icons_by_image` | Absolute `imagePath`, optional source filter; requires configured vision model and permission          |
| `sync_repository`       | `sourceId`; updates the local Git snapshot for the specified repository                                |

`target` supports `svg`, `html`, `react`, `vue`, and `swiftui`. The MCP server does not modify user projects directly; agents persist returned resources into their own workspaces. Query tools are declared read-only, and repository synchronization is declared as local state updates.

Vision search can take longer than default client timeouts. In Codex, add `tool_timeout_sec = 240` under the `[mcp_servers.desicast]` configuration section, or adjust the corresponding timeout setting in other clients.

### Troubleshooting

- **Public API Offline**: Matching cached icons remain accessible; uncached icons require network restoration.
- **Synchronization Failure**: Verify Git installation, network connection, HTTPS repository URL, branch name, folder paths, and access tokens. SSH and Git Submodules are not supported in this version.
- **Rejected SVGs**: Scripts, external references, CSS style blocks, SVG filters, and unsupported markup are rejected. Standard paths, gradients, clipping, masks, local definitions, inline styles, and Figma layer IDs are preserved; limits are 1 MB per SVG and 50,000 indexed icons per repository.
- **High Result Counts**: Public search returns up to the top 999 matches; refine queries with specific keywords or collection names. Team repository pagination is not restricted by this limit.
- **SwiftUI Icon Not Visible**: Both the code snippet and the exported `.imageset` directory must be imported into Xcode's `Assets.xcassets`; DesiCast uses native asset catalogs rather than runtime SVG string parsers.

### License

No public distribution license has been declared for DesiCast. Gendesign source code is explicitly authorized by its repository owner for use in this application; upstream does not declare a license (see provenance records). Public icon sets and third-party dependencies retain their respective licenses; the Iconify framework license does not supersede individual collection licenses.

<p align="right"><a href="#readme-top">↑ Back to Top</a></p>
