# 实际参考与依赖记录

## GitHub 扩展发行依据（2026-09-14）

- 用户明确要求改为酒馆“安装扩展”，并选择新建公开仓库 yui-ovo/yui-pocket（包含当前供图）。因此增加扩展入口，保留原自包含 JSON；未新增依赖，也未使用其他小手机实现。
- 查阅 [官方扩展文档](https://docs.sillytavern.app/for-contributors/writing-extensions/) 的 manifest、bundling、生命周期字段。
- 实际下载核实 SillyTavern 1.18.0 固定 commit `8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8` 的 [public/scripts/extensions.js](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/extensions.js)：addExtensionScript 加载 type=module；callExtensionHook 动态导入 manifest.js 并调用 manifest.hooks 的导出函数；activate/enable/disable/delete 均存在。更新完成提示刷新页面，因此本项目不自造在线热更新器。auto_update=false，后续使用宿主手动更新。
- 同版本 [src/endpoints/extensions.js](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/src/endpoints/extensions.js)：安装会 Git clone 用户给定仓库并读取根目录 manifest；更新使用当前分支 git pull。由此根目录交付 manifest.json 与已经打包的 extension.js，而非只上传 JSON。
- 使用当前窗口 DOM 与标准 pagehide，所有清理仍集中适配层。manifest 无 css 字段，样式继续在 Shadow DOM 内。没有调用宿主聊天、模型或设置 API。
- TauriTavern 的此组钩子/安装更新兼容性未实测；无钩子的环境依靠模块启动和禁用后刷新卸载，不能宣称已验证兼容。

## 挂绳与白边修订（2026-09-14，当前）

- 用户指定 `codex-clipboard-79ae62ec-8568-4fff-9e2d-dc49951ae6cf.png` 作为新挂绳并要求抠图；未下载其他素材。先尝试两次图像编辑工具，均输出了不透明棋盘格，已检查并排除，未纳入交付。
- 用户明确回复“改用本地抠图算法”后，使用本地 Pillow / NumPy 对原始 RGB 做连通浅色背景分离、边缘透明度处理和裁边。保留珠子/角色内的白色填充与原图纹理，没有重新生成挂绳。输出 `outputs/yui-strap-cutout.png`（593×1368 RGBA）；内嵌副本为 `src/assets/strap-cutout.png`（303×700 RGBA）。工具仅用于开发期素材处理，不是运行依赖，也没有添加 npm 依赖。
- 右上胶布和右下十字不再显示；原始供图与旧 SVG 源码保留但未使用的资源不进入构建。光环仍由 lace-bandage.png 下方图案裁显。供图作者与再分发许可未另行核实，不将其标为本项目原创。
- 用户提供的两张 TauriTavern / 移动 UI 截图作为白边及按钮位置的问题依据；这不是本轮开发者在真实宿主上的测试。本轮只执行本地模拟浏览器验证，未新增或变更助手业务 API。

以下为之前修订的历史记录，其中描述的旧贴纸和 SVG 挂件已按本节替换。

## 当前 Yui 修订补充（2026-09-14）

- 产品依用户要求由 ruru-pocket 改名 **Yui**。源码的私有单实例 Symbol 仍保留旧键以便接替已运行的旧版本；这是内部兼容标识，不显示给用户。导入文件现在是 dist/yui.v0.1.json，旧文件仅留作历史产物。
- 新参考一 `codex-clipboard-64a70567-f95c-45c7-88f7-35b82271e0b7.png` 原样复制为 src/assets/lace-bandage.png。上白边使用交叉蕾丝胶布，下白边及主屏装饰使用同一图下方爱心光环，由 CSS 容器定位/裁显。
- 新参考二 `codex-clipboard-e33d12ac-f0fd-40cf-8985-931427baa284.png` 原样复制为 src/assets/lace-cross.png，放置在 Home 右侧，CSS 裁显中央图案。文件未被重绘、抠图或去水印；浏览器界面边缘不作为贴纸内容展示。
- 两张 PNG 与此前用户指定的信封 JPEG 全部 data URL 内嵌，保持栅格图自身的柔糊/颗粒纹理。没有调用 AI 生成服务、下载远程素材或把供图冒充原创；没有尝试全面原创审计。供图作者/许可未另行核实，公开发布前仍需确认或替换。
- 新参考三用于底部 Dock 的视觉与图标排列方向，新参考四为用户指出当前问题的截图。未复制参考三的应用图标、应用名或系统代码；只移动本项目已有信息入口，新增联系人列表/返回路径由原生 DOM 编写。
- 本轮没有新增依赖或助手业务 API，沿用下文固定 commit 已核实的导入结构与生命周期。以下初版/上一轮记录属于历史，不代表当前仍使用平滑矢量贴纸。

核实日期：2026-09-14。这里只记录实际访问/读取的资料与本项目采用的通用机制，不声称做过全面原创审计，不保证零相似度。

## 平台格式与运行环境

助手仓库固定 commit：`04a62b763513744b8cb3d85322f9b5c73bdf8a85`；manifest 版本 4.9.5。通过 GitHub API 读取 main 当时的 commit，再按该 commit 获取下列源码。仅检查平台源文件，没有下载任何其他作者的小手机。

| 官方依据 | 核实结论 / 本项目采用 |
| --- | --- |
| [src/type/scripts.ts](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/type/scripts.ts) | 单个 Script 对象：type、enabled、name、id、content、info、button、data、export_with；button 是对象，buttons 在其中；无旧版顶层 buttons。按真实字段生成，未复制业务实现。 |
| [Toolbar.vue](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/panel/script/Toolbar.vue) | 导入 JSON.parse 后交给 ScriptTree，旧顶层 buttons 才走兼容分支；导入后 enabled=false 并重新分配 id。全局/角色/预设三种目标。 |
| [ScriptItem.vue](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/panel/script/ScriptItem.vue) | 导出把 Script 对象序列化为 JSON，export_with 控制保留 data/button；脚本开关控制 enabled。 |
| [Iframe.vue](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/panel/script/Iframe.vue) 与 [iframe.ts](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/panel/script/iframe.ts) | 脚本运行于隐藏 iframe，使用 srcdoc 或 blob HTML，content 放在 module script。源码所示 iframe 无 sandbox 属性，同源访问 parent.document 可用于挂载；真实目标配置待验证。 |
| [Script.vue](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/panel/Script.vue) 与 [iframe_runtimes/script.ts](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/store/iframe_runtimes/script.ts) | 启用脚本派生 runtimes，v-for 创建 iframe；source/id/reload_memo 构成 key。禁用和重新加载会改变运行实例。 |
| [脚本库官方说明](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/脚本库.html) | 使用 jQuery ready 等待启动；pagehide 为脚本关闭清理约定。用原生 addEventListener 注册同一标准事件，未编造助手事件名。 |
| [cleanup_protector.js](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/iframe/cleanup_protector.js) 与 iframe.ts | 上游可注入自动清理保护；content 包含 pagehide 时不注入。本项目明确实现自己的清理，不依赖上游自动追踪。没有复制该保护器。 |
| [third_party_script.html](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/src/iframe/third_party_script.html) 与 iframe.ts | 助手本身加载远程 Vue / Vue Router / log.js。这属于宿主，ruru-pocket 的 content 不引用它们；零主动请求的测试边界限于本项目代码。 |
| [manifest.json](https://github.com/n0vi028/JS-Slash-Runner/blob/04a62b763513744b8cb3d85322f9b5c73bdf8a85/manifest.json) | 4.9.5、minimum_client_version 1.12.13，包含 TauriTavern activate hook。这个 hook 的存在不等于本项目已兼容 TauriTavern。 |

还阅读了助手 `@types/iframe/script.d.ts` 的脚本按钮/信息声明和官方“访问酒馆接口或其他插件”页面。本轮不使用这些业务 API，没有按钮注册、生成、聊天读写、设置更新或提示词注入。

SillyTavern：访问[官方仓库](https://github.com/SillyTavern/SillyTavern)，核实 release commit `8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8` 的 [package.json](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/package.json) 版本 1.18.0。只是平台版本基线，未下载安装或运行 SillyTavern。本轮不读取 ST 聊天 API。

## 通用浏览器依据

- [MDN Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)：独立 ShadowRoot 样式隔离。它是样式边界，不是安全沙箱。
- [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)：可视区域 height/width/offsetTop/offsetLeft 与 resize/scroll 事件。只监听事件，不轮询；使用真实可视高度触发紧凑模式。

## 构建/测试依赖

使用官方 npm 包，精确版本与传递依赖/完整性由 package-lock.json 锁定。许可证来自实际安装包 package.json。没有运行时 npm 依赖，没有把测试工具/平台源码打入产物。

| 开发依赖 | 版本 | 许可 | 来源 / 用途 |
| --- | --- | --- | --- |
| TypeScript | 7.0.2 | Apache-2.0 | [microsoft/TypeScript](https://github.com/microsoft/TypeScript)，类型检查 |
| esbuild | 0.28.2 | MIT | [evanw/esbuild](https://github.com/evanw/esbuild)，TS + CSS 自包含打包 |
| @playwright/test | 1.63.0 | Apache-2.0 | [microsoft/playwright](https://github.com/microsoft/playwright)，无头浏览器模拟测试 |

本地 Chrome 153.0.8010.37 是测试运行环境，不随项目再分发。Node 内置 test/assert/fs/http/vm 用于工程工具，无额外运行库。安装时 npm audit 报告 0 vulnerabilities；该报告不代替完整安全审计。

## 视觉与原创范围

初次 v0.1 的两张手机参考 JPG 用来理解“奶白、粉、复古玩具、挂件与贴饰”方向，初次实现没有把文件拷入工程。没有其他小手机源码、提示词、配套正则或素材作为底稿，也未访问或执行这类实现。

2026-09-14 追加的 14 张参考用于本轮 4S 外观与主屏幕修订：

- 用户明确要求使用图三图标。原样复制其提供的 `codex-clipboard-5f4b3ede-49d3-4d7b-93fe-b3948271d71d.jpg` 到 `src/assets/message-icon.jpg`，经 esbuild dataurl loader 内嵌。没有远程下载、裁切、重绘、去水印或声称其原创属于本项目。作者/再分发许可未另行核实，后续公开发布前应替换为已确认许可或自行绘制的素材。
- 图一、二、四、五提供机身、宽白边和矩形屏幕的视觉参考。使用 CSS 独立实现，不把手机照片当整张背景，不加载其他手机脚本。未访问 Apple 系统实现，未称做过尺寸精密测量或逐像素复刻。
- 挂件/贴纸照片和图表（图六至十四）用于粉色缎带、珍珠、透明爱心、星形、翅膀等通用装饰方向。新编写 `ornaments.ts` 用 SVG 基本形状/路径和局部渐变组合出挂件与贴饰；没有裁取品牌、角色、图中签名或专用文案。图十一中的社交账号名称不是本项目作者署名。
- 主屏幕浅粉格纹、爱心翅膀图案和信息页样式是本项目新写的 CSS/SVG；消息文案仍为虚构示例。`createElementNS` 的 SVG namespace URL 是标准标识，`url(#rp-...)` 是本地渐变引用，均非网络请求。

本轮无新增依赖，无新增助手业务 API；继续使用上文已经核实的导入结构、同源挂载和 pagehide 生命周期。

工作目录 work/official 是此次平台接口核实的临时证据，不属于运行产物或交付源码包；交付保留以上固定 commit 链接便于复核。
