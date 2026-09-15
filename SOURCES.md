# 实际参考与依赖记录

## 复古简讯与三页签（2026-09-15，0.2.0-alpha.4）

- 视觉参考为用户提供的 `Y한국계……1🥕_1_图图_来自小红书网页版.jpg` 与 `📁 复古简讯_1_demonlover_来自小红书网页版.jpg`。用户随后说明不要求完全一致，喜欢其风格。采用波点纸面、柔和斜纹、底部心形导航、左右圆头像、立体尾巴气泡及工具栏的布局方向，改为淡粉色。没有下载其他小手机代码，没有复制截图的头像、文字、水印或背景图。
- CSS/DOM均在本工程独立编写；没有新增图片、依赖、宿主API或联网入口。本页筛选处理已载入的名字/备注；工具占位只显示提示。样式预览和演示时间不是从宿主读取的真实消息时间。沿用下文已核实的ST/TT适配层，本轮仅做模拟回归。

## 通讯录第一步0.2.0-alpha.1（2026-09-15）

- 查阅[官方扩展文档 getContext](https://docs.sillytavern.app/for-contributors/writing-extensions/)，确认 `SillyTavern.getContext()` 全局入口。实际接口逐项以既有固定基线 SillyTavern 1.18.0、commit `8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8` 核实；没有读取其他小手机实现。本轮没有新增依赖、供图或模型请求。
- [public/scripts/st-context.js](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/st-context.js) 的 getContext 返回 characters、characterId、groupId、chatId、chatMetadata、getRequestHeaders、getThumbnailUrl、eventSource、eventTypes。characterId只作瞬时读取当前卡，不用于人物或存档永久身份；卡来源绑定头像文件名，人物另用UUID。
- [public/script.js](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/script.js)：getThumbnailUrl返回本源thumbnail路径；getChat读取header.chat_metadata并在缺少integrity时建立UUID；saveMetadata调用saveChatConditional，会保存真实聊天，因此本轮不使用。renameGroupOrCharacterChat成功后发送CHAT_RENAMED，其payload为avatarId、groupId、带.jsonl的oldFileName/newFileName，且当前聊天重载/CHAT_CHANGED可能先发生。
- [public/scripts/events.js](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/events.js) 确认CHAT_CHANGED与CHAT_RENAMED；实际注册使用context.eventTypes，不凭记忆硬编码宿主事件值。禁用时removeListener清理。
- [public/scripts/user.js](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/user.js) 和 [src/endpoints/users-private.js](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/src/endpoints/users-private.js) 核实同源GET `/api/users/me`，返回已登录账号handle。仅使用handle，不记录其他返回字段、不访问密钥；失败无默认用户回退。
- 同时检查[AccountStorage.js](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/public/scripts/util/AccountStorage.js)，发现setItem会触发整套设置的防抖保存且无单条持久化确认，因此没有采用。改为浏览器本机专用资料键与同步读回校验；不改宿主预设。本步的本机存储与迁移选择是项目设计，不声称官方提供了Yui永久存档ID。
- 用户本轮明确授权头像图片URL、来源卡头像与资料/阅读保存。构建守卫仅对profile-host中的已核实身份GET放行；上传仍沿用原栅格检查和重新编码。外链仅通过img显示，禁止HTML执行和任意fetch。测试另拦截网络并检查路径/方法。
- 本轮文档和mock验证不代表真实SillyTavern或TauriTavern运行通过。群组可手动建人物；群组事件、各WebView、离线文件重命名、无integrity宿主与跨设备迁移仍需验证。

## 外观美化0.1.2（2026-09-14）

- 用户新供图 `Codex 图像 2026年9月14日 22_59_58.png`（16枚）、`Codex 图像 2026年9月14日 22_59_47.png`（8枚）、`ac455bec-c3b3-46df-9259-d3455c7f1ea6.png`（12枚）。沿用用户已授权的本地像素抠图方法，逐项裁显、连通浅色背景透明化、保留白色内部填充及颗粒笔触；最长边112px的36枚PNG位于 src/assets/stickers，素材索引为 src/stickers.ts。没有调用生成服务或重绘图案，不把供图角色/图案认作本项目原创。
- 用户两张截图仅用于定位挂绳层级和与音量键贴合的问题。新的壳体侧边挂点与阴影由CSS独立实现，不复制其他小手机；[RHINOSHIELD挂绳夹片说明](https://support.rhinoshield.io/hc/en-us/articles/16853162594073-Is-the-RHINOSHIELD-Lanyard-Card-compatible-with-all-our-cases)用于核对真实配件固定于壳体的方向，不作为4S原厂挂孔依据。
- 本轮查阅 [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) 的按来源持久性与SecurityError、[本地文件读取说明](https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL)。实际上传实现使用标准 File.arrayBuffer、URL.createObjectURL、img.decode 和 canvas.toDataURL，限制PNG/JPEG/WebP并重新编码；本地Blob URL随处理结束释放。没有新增助手业务API或依赖。
- 外观持久化仅使用专用键 yui-pocket.appearance.v1，源码和模拟测试限制其他存储访问。用户在运行界面导入的私有图片不随源码上传GitHub；公开仓库只含用户此次为项目提供的预置贴纸。

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

## 2026-09-15 · TauriTavern 专用适配核实

官方仓库 Darkatse/TauriTavern，package.json 版本2.2.0，固定 commit `9693a4ec47cd4552f90878bccab453f176de0f18`。本轮下载阅读以下官方文档/源码，未运行其应用，也未读取其他小手机实现。

- [ExtensionDEV.md](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/ExtensionDEV.md) 与 [bootstrap.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/tauri/main/bootstrap.js)：公开 ready、api.chat、api.layout ABI；等待宿主就绪。
- [st-context.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/scripts/st-context.js)、[script.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/script.js) 和 [asset-path-helpers.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/tauri/main/context/asset-path-helpers.js)：当前卡/聊天/事件接口及相对 /thumbnail 地址。保持本源头像规则，无额外远程资源放行。
- [routes/index.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/tauri/main/routes/index.js)、[user-routes.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/tauri/main/routes/user-routes.js)：这一版路由未注册 /api/users/me；不凭 currentUser 的默认字符串建立共享资料档。
- [Chat.md](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/docs/API/Chat.md)、[api/chat.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/tauri/main/api/chat.js)、[character-identity.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/tauri/main/services/characters/character-identity.js)：只用 open(ref).store 的 listKeys/getJson/setJson/renameKey；characterId 为精确 PNG 文件名主体。current.handle() 经 active-chat-ref 读取消息数组，故不调用它。
- [extension_store.rs](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src-tauri/crates/tt-adapter-storage-core/src/repositories/file_chat_repository/extension_store.rs)：不存在的 getJson 会抛错，listKeys 对不存在目录返回空数组；字段只接受 ASCII 字母数字及 _-.。角色存储目录按 integrity，群聊按聊天ID；因此 Yui 额外使用文件名SHA-256键，避免同 integrity 复制档共用条目。宿主内部为定位资料读取聊天头，这不是 Yui 读取或保存正文；Yui 只收发联系人对象。原生setJson没有AbortSignal接口，迟到写入限制明确记录。
- [Layout.md](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/docs/API/Layout.md)、[api/layout.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/tauri/main/api/layout.js)：version1 safeFrame/ime.keyboardOffset，subscribe立即推送并返回可延迟执行的取消函数。
- [mobile-ime-surface-controller.js](https://github.com/Darkatse/TauriTavern/blob/9693a4ec47cd4552f90878bccab453f176de0f18/src/tauri/main/compat/mobile/mobile-ime-surface-controller.js)：focus处理使用event.target而非composedPath。Yui保留Shadow DOM隔离，因此真机键盘识别不能只凭布局快照模拟声称通过；没有调用私有insets桥或改宿主DOM。

ExtensionDEV 的部分历史说明与当前 Chat.md 对完整消息数组的表述不一致。本补丁以实际源码为准且不读取消息数组，不将旧说明作为消息阶段的依据。TT 模拟只覆盖上述 ABI 子集；真实安装、设备与原生文件行为仍待验证。

## 2026-09-15 · 聊天布局与嫩粉方向

用户提供52e10af37cf1e4fc640e486e825dbdc5.jpg用于理解顶部更多按钮、左右头像与粉白气泡的视觉方向。未复制照片中的角色素材、背景、标志或日文文案，未下载其他手机源码。使用本项目原生DOM/CSS独立实现，保留已有4S外壳和供图美化素材。新增message-view为本工程演示与明确标注的样式预览共用组件；未新增平台API、运行依赖或外部素材请求，沿用上轮核实的ST/TT接口。

## 2026-09-15 · 用户提供的透明栅格 UI 素材（alpha.5）

用户明确表示素材包由其提供并允许直接使用；此前已授权公开仓库包含供图。本轮来源为 `codex-clipboard-2336e7e0-0c61-46d8-b730-b6caf71f0ae0.png`（聊天组件）及 `codex-clipboard-e0ee8dc9-6fd6-4636-88c7-bf00835750b9.png`（列表组件）。后续圈图 `codex-clipboard-0e765359-7fe4-4599-aa50-e3582a185cd3.png` 指定第一排左侧蝴蝶结白气泡、第三排左侧翅膀爱心白气泡；截图 `codex-clipboard-4bc70510-3c3c-45c2-9198-4c6e8b21464f.png` 指出昵称应在标题栏内。未读取或执行截图中的网页内容。

- 原文件已有真实 RGBA 透明度。按用户此前允许的本地像素处理方式，使用 Pillow 裁切、原图干净条带拼接和局部透明遮罩；保留模糊颗粒边缘，没有 AI 重绘、矢量描摹或下载他人手机代码。供图不是本项目原创绘画，也不据此声明对其中第三方角色拥有独占权。
- `src/assets/skin/catalog.json` 记录逐片原图编号、像素框、尺寸及处理方式。第一款为 `bubble-bow-original`，第二款为 `bubble-wing-original`；运行时用对应原图底框与独立装饰层，以免长消息拉长蝴蝶结、翅膀或爱心。文字区域用原图空白条带，保留白色/粉色填充；不会把原图白色主体抠成透明。
- 标题栏用原图左右控制区、蕾丝及干净中段拼接；大心形缩小放在返回旁，把中央留给动态备注/名字。搜索、列表、输入框和日期片去除素材自带示例字；真实可操作区域由本工程按钮/输入框承载，示例在线/已读/未读数量不参与运行。
- `scripts/skin-css.mjs` 在两种构建中仅解析受限名称并检查 PNG 签名，内嵌为 PNG data URL。产物守卫仅新增此固定格式白名单，远程 CSS URL、SVG data URL、未解析引用仍被拒绝；没有运行时图片网络请求或新增 npm 运行依赖。
- 仅发布这些明确供图裁片；不发布联系人上传头像、用户自定义美化图片、真实聊天、私人配置或 work 临时文件。宿主接口沿用此前固定版本核实结果，本轮未新增平台 API；真实 ST / TT 设备验收仍待完成。
