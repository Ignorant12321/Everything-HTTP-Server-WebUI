// 收藏模块：维护收藏列表、收藏按钮状态、收藏项跳转和拖动排序。

function attachFavoriteMethods(app) {

  app.renderFavorites = function renderFavorites() {
        const list = this.dom.favList; // 获取侧边栏收藏列表容器
        if (this.state.favorites.length === 0) {
            list.innerHTML = `<div class="sidebar-empty">暂无收藏文件</div>`;
            return;
        }
        let html = '';
        this.state.favorites.forEach((fav, index) => {
            const isFolder = fav.isFolder || false;
            let path = fav.path || '';
            if (!path && isFolder && fav.url) {
                path = fav.url.replace(/^\//, '').replace(/\//g, '\\');
            }
            const icon = this.getFileIcon(fav.name, isFolder);
            const safeUrl = fav.url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const safeName = fav.name.replace(/'/g, "\\'");
            const safePath = path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            html += `<div class="sidebar-item fav-drag-item" data-fav-index="${index}" onclick="app.openFavorite('${safeUrl}', '${safeName}', ${isFolder}, '${safePath}')">
                <span class="file-icon" style="font-size:16px">${icon}</span>
                <span class="fav-label">${fav.name}</span>
            </div>`;
        });
        list.innerHTML = html;
        this.bindFavoriteDrag();
  };

  app.bindFavoriteDrag = function bindFavoriteDrag() {
        const list = this.dom.favList;
        if (!list || list.dataset.dragBound === '1') return;
        list.dataset.dragBound = '1';

        let dragEl = null;
        let activePointer = null;
        let startY = 0;
        let started = false;
        let suppressClick = false;
        let holdTimer = null;
        let holdItem = null;
        let armedByHold = false;
        let dropTarget = null;
        let dropBefore = true;

        const clearHold = () => {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            if (holdItem) {
                holdItem.classList.remove('touch-ready');
                holdItem = null;
            }
            armedByHold = false;
            list.style.touchAction = '';
        };

        const clearDropMarks = () => {
            list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            list.classList.remove('drag-before', 'drag-after');
            dropTarget = null;
        };

        const clearState = () => {
            clearHold();
            clearDropMarks();
            if (dragEl) {
                dragEl.classList.remove('dragging');
                dragEl.style.width = '';
            }
            dragEl = null;
            activePointer = null;
            started = false;
        };

        const updateHover = (clientY) => {
            if (!dragEl) return;
            const items = [...list.querySelectorAll('.fav-drag-item')];
            const target = items.find(el => {
                if (el === dragEl) return false;
                const rect = el.getBoundingClientRect();
                return clientY >= rect.top && clientY <= rect.bottom;
            });
            clearDropMarks();
            if (!target) return;
            dropTarget = target;
            const tRect = target.getBoundingClientRect();
            dropBefore = clientY < tRect.top + tRect.height / 2;
            target.classList.add(dropBefore ? 'drag-over' : 'drag-over');
            list.classList.add(dropBefore ? 'drag-before' : 'drag-after');
        };

        const startDrag = (item) => {
            const rect = item.getBoundingClientRect();
            dragEl = item;
            started = true;
            suppressClick = true;
            list.style.touchAction = 'none';
            item.classList.add('dragging');
            item.classList.remove('touch-ready');
            item.style.width = `${rect.width}px`;
        };

        const commit = () => {
            if (started && dropTarget && dropTarget !== dragEl) {
                if (dropBefore) {
                    list.insertBefore(dragEl, dropTarget);
                } else {
                    list.insertBefore(dragEl, dropTarget.nextSibling);
                }
                const order = [...list.querySelectorAll('.fav-drag-item')]
                    .map(el => this.state.favorites[Number(el.dataset.favIndex)])
                    .filter(Boolean);
                if (order.length === this.state.favorites.length) {
                    this.state.favorites = order;
                    localStorage.setItem('favorites', JSON.stringify(order));
                }
            }
            const wasStarted = started;
            clearState();
            if (wasStarted) {
                this.renderFavorites();
                setTimeout(() => { suppressClick = false; }, 0);
            }
        };

        list.addEventListener('pointerdown', (e) => {
            if (e.button != null && e.button !== 0) return;
            const item = e.target.closest('.fav-drag-item');
            if (!item) return;

            activePointer = e.pointerId;
            startY = e.clientY;
            suppressClick = false;
            dragEl = null;
            started = false;
            armedByHold = false;
            holdItem = item;
            dropTarget = null;

            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                holdItem.classList.add('touch-ready');
                holdTimer = setTimeout(() => {
                    armedByHold = true;
                    list.style.touchAction = 'none';
                    try { item.setPointerCapture(e.pointerId); } catch (_) { }
                    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (_) { } }
                }, 350);
            }

            const onPointerMove = (ev) => {
                if (ev.pointerId !== activePointer) return;
                if (!started) {
                    const dy = Math.abs(ev.clientY - startY);
                    if (ev.pointerType === 'mouse') {
                        if (dy < 10) return;
                        clearHold();
                        startDrag(item);
                    } else {
                        if (!armedByHold) {
                            if (dy > 8) clearHold();
                            return;
                        }
                        if (dy < 8) return;
                        startDrag(item);
                    }
                }
                ev.preventDefault();
                updateHover(ev.clientY);
            };

            const onPointerUp = (ev) => {
                if (ev.pointerId !== activePointer) return;
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
                window.removeEventListener('touchmove', onTouchMove, true);
                commit();
            };

            const onTouchMove = (ev) => {
                if (started || armedByHold) {
                    ev.preventDefault();
                }
            };

            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
            window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
        });

        list.addEventListener('click', (e) => {
            if (suppressClick) {
                e.stopPropagation();
                e.preventDefault();
                suppressClick = false;
            }
        }, true);
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
