// 收藏模块：维护收藏列表、收藏按钮状态和收藏项跳转。

function attachFavoriteMethods(app) {

  app.renderFavorites = function renderFavorites() {
        const list = this.dom.favList; // 获取侧边栏收藏列表容器
        if (this.state.favorites.length === 0) {
            list.innerHTML = `<div style="padding:4px 12px; color:var(--text-secondary); font-size:12px">暂无收藏文件</div>`;
            return;
        }
        let html = '';
        this.state.favorites.forEach(fav => {
            const isFolder = fav.isFolder || false;
            let path = fav.path || '';
            if (!path && isFolder && fav.url) {
                path = fav.url.replace(/^\//, '').replace(/\//g, '\\');
            }
            const icon = this.getFileIcon(fav.name, isFolder);
            const safeUrl = fav.url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const safeName = fav.name.replace(/'/g, "\\'");
            const safePath = path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            html += `<div class="sidebar-item" onclick="app.openFavorite('${safeUrl}', '${safeName}', ${isFolder}, '${safePath}')">
                <span class="file-icon" style="font-size:16px">${icon}</span> ${fav.name}
            </div>`;
        });
        list.innerHTML = html;
  };

  app.openFavorite = function openFavorite(url, name, isFolder, path) {
        if (isFolder) {
            let targetPath = path;
            if (!targetPath && url) {
                targetPath = url.replace(/^\//, '').replace(/\//g, '\\');
            }

            if (targetPath) {
                this.navigateTo(targetPath, true);
            }
        } else {
            this.handleOpenAction({ name: name, path: '', fakeUrl: url });
        }
  };

  app.toggleFavoriteCurrent = function toggleFavoriteCurrent() {
        if (this.state.activeFileIndex === -1) return;
        const file = this.state.openFiles[this.state.activeFileIndex];
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
        localStorage.setItem('favorites', JSON.stringify(this.state.favorites));
        this.renderFavorites();
        this.updateViewerFavIcon();
  };

  app.toggleFavoriteFromDetail = function toggleFavoriteFromDetail() {
        if (!this.state.selectedItem) return;
        const item = this.state.selectedItem;
        const url = item.fakeUrl || this.getFileUrl(item);
        const exists = this.state.favorites.some(f => f.url === url);

        if (exists) {
            this.state.favorites = this.state.favorites.filter(f => f.url !== url);
        } else {
            const isDir = (!item.size && item.size !== 0) || item.type === 'folder';
            const fullPath = item.path ? `${item.path}\\${item.name}` : item.name;
            this.state.favorites.push({
                name: item.name,
                url: url,
                path: fullPath, // 保存物理路径，用于打开时跳转
                isFolder: isDir // 保存类型标识，区分文件/文件夹
            });
        }
        localStorage.setItem('favorites', JSON.stringify(this.state.favorites));
        this.renderFavorites();
        this.renderDetails(item);
  };

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
  };


}
