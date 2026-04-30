// 收藏模块：维护收藏列表、收藏按钮状态和收藏项跳转。

import { svg_disk, svg_favorite_filled, svg_favorite_outline, svg_play, svg_pause, svg_loop_none, svg_loop_single, svg_loop_list, svg_shuffle_list, svg_fullscreen, svg_close, svg_volume, svg_volume_mute } from './icons.js';



export function attachFavoriteMethods(app) {

  app.renderFavorites = function renderFavorites() {
        const list = this.dom.favList; // 获取侧边栏收藏列表容器
        // 无收藏项时显示空状态提示
        if (this.state.favorites.length === 0) {
            list.innerHTML = `<div style="padding:4px 12px; color:var(--text-secondary); font-size:12px">暂无收藏文件</div>`;
            return;
        }
        let html = '';
        // 遍历所有收藏项，生成单个收藏项DOM
        this.state.favorites.forEach(fav => {
            // 兼容旧数据：获取是否为文件夹（旧收藏项无isFolder则默认false）
            const isFolder = fav.isFolder || false;
            let path = fav.path || '';
            if (!path && isFolder && fav.url) {
                // url路径格式转换：移除开头/，将/替换为\（适配本地路径格式）
                path = fav.url.replace(/^\//, '').replace(/\//g, '\\');
            }
            // 根据类型（文件/文件夹）获取对应图标
            const icon = this.getFileIcon(fav.name, isFolder);
            // 安全处理：转义特殊字符（反斜杠/单引号），防止HTML注入和字符串解析错误
            const safeUrl = fav.url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const safeName = fav.name.replace(/'/g, "\\'");
            const safePath = path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            // 拼接收藏项
            html += `<div class="sidebar-item" onclick="app.openFavorite('${safeUrl}', '${safeName}', ${isFolder}, '${safePath}')">
                <span class="file-icon" style="font-size:16px">${icon}</span> ${fav.name}
            </div>`;
        });
        // 将拼接好的HTML渲染到收藏列表容器
        list.innerHTML = html;
    },

    // 打开收藏的文件/文件夹
    /**
     * @param {string} url - 收藏项的访问地址（安全处理后）
     * @param {string} name - 收藏项名称（安全处理后）
     * @param {boolean} isFolder - 是否为文件夹（true/false）
     * @param {string} path - 文件夹物理路径
     * 核心逻辑：文件夹跳转路径，文件执行打开操作
     */;

  app.openFavorite = function openFavorite(url, name, isFolder, path) {
        if (isFolder) {
            // 确定文件夹目标路径：优先取传入的path，无则从url转换
            let targetPath = path;
            if (!targetPath && url) {
                targetPath = url.replace(/^\//, '').replace(/\//g, '\\');
            }

            // 有有效路径时，跳转到该文件夹路径
            if (targetPath) {
                this.navigateTo(targetPath, true);
            }
        } else {
            // 文件类型：调用通用打开逻辑，传入名称和fakeUrl
            this.handleOpenAction({ name: name, path: '', fakeUrl: url });
        }
    },

    // 切换当前预览文件的收藏状态（预览弹窗中触发）
    // 注：当前预览默认按文件处理（isFolder=false）/;

  app.toggleFavoriteCurrent = function toggleFavoriteCurrent() {
        // 无激活的预览文件时，直接返回（避免空操作）
        if (this.state.activeFileIndex === -1) return;
        // 获取当前激活的预览文件
        const file = this.state.openFiles[this.state.activeFileIndex];
        // 判断该文件是否已收藏（通过url唯一标识）
        const exists = this.state.favorites.some(f => f.url === file.url);
        if (exists) {
            this.state.favorites = this.state.favorites.filter(f => f.url !== file.url);
        } else {
            this.state.favorites.push({
                name: file.name,
                url: file.url,
                isFolder: false
            });
        }
        // 保存收藏列表到本地存储
        localStorage.setItem('favorites', JSON.stringify(this.state.favorites));
        this.renderFavorites();
        this.updateViewerFavIcon();
    },
    // 从详情面板切换文件/文件夹的收藏状态;

  app.toggleFavoriteFromDetail = function toggleFavoriteFromDetail() {
        if (!this.state.selectedItem) return;
        const item = this.state.selectedItem;
        // 获取选中项的访问地址（优先取fakeUrl，无则调用getFileUrl生成）
        const url = item.fakeUrl || this.getFileUrl(item);
        // 判断该项是否已收藏（通过url唯一标识）
        const exists = this.state.favorites.some(f => f.url === url);

        if (exists) {
            this.state.favorites = this.state.favorites.filter(f => f.url !== url);
        } else {
            // 判断是否为文件夹：
            // - 无size且size≠0（文件夹无大小） 或 type=folder 则判定为文件夹
            const isDir = (!item.size && item.size !== 0) || item.type === 'folder';
            // 拼接文件夹完整物理路径：path + 名称（文件则仅保存名称）
            const fullPath = item.path ? `${item.path}\\${item.name}` : item.name;
            // 未收藏：添加到收藏列表（保存名称、地址、物理路径、类型）
            this.state.favorites.push({
                name: item.name,
                url: url,
                path: fullPath, // 保存物理路径，用于打开时跳转
                isFolder: isDir // 保存类型标识，区分文件/文件夹
            });
        }
        // 保存收藏列表到本地存储
        localStorage.setItem('favorites', JSON.stringify(this.state.favorites));
        this.renderFavorites();
        this.renderDetails(item);
    },
    // 更新预览弹窗中的收藏图标样式;

  app.updateViewerFavIcon = function updateViewerFavIcon() {
        if (this.state.activeFileIndex === -1) return;
        const file = this.state.openFiles[this.state.activeFileIndex]; // 获取当前预览文件
        const exists = this.state.favorites.some(f => f.url === file.url); // 判断是否已收藏
        const btn = this.dom.viewerFavBtn; // 获取预览弹窗收藏按钮
        if (exists) {
            btn.innerHTML = svg_favorite_filled;
        } else {
            btn.innerHTML = svg_favorite_outline;
        }
    },



    /* ##########
    // 设置选项
    ########## */

    // 设置文件列表视图模式（列表/网格）;

}
