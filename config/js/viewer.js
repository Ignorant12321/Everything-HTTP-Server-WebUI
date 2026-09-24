// 预览模块：打开文件、管理预览窗口、多任务和图片缩放。

function attachViewerMethods(app) {

  app.openOverlay = async function openOverlay(item) {
        const url = item.fakeUrl || this.getFileUrl(item);
        const ext = item.name.split('.').pop().toLowerCase();

        const existingIndex = this.state.openFiles.findIndex(f => f.url === url);
        if (existingIndex !== -1) {
            this.activateFile(existingIndex);
            return;
        }

        const newFile = {
            name: item.name,
            url: url,
            ext: ext,
            type: this.getFileType(ext),
            content: null,
            uniqueId: 'file-' + Date.now(),
            fullPath: this.getViewerFileFullPath(item, url)
        };

        this.state.openFiles.push(newFile);
        this.activateFile(this.state.openFiles.length - 1);
    };

  app.activateFile = async function activateFile(index) {
        this.state.activeFileIndex = index;
        this.renderTaskBar();
        this.updateViewerFavIcon(); // Update favorite icon state

        const file = this.state.openFiles[index];
        const modal = this.dom.viewerModal;
        const contentContainer = this.dom.viewerContent;
        if (file.type === 'audio') {
            modal.classList.add('music-mode');
        } else {
            modal.classList.remove('music-mode');
        }
        if (file.type === 'video') {
            this.dom.viewerSubBtn.style.display = 'flex';
        } else {
            this.dom.viewerSubBtn.style.display = 'none';
        }

        this.state.imageZoom = 0.9; this.state.imagePos = { x: 0, y: 0 };
        this.dom.viewerTitle.textContent = file.name;
        this.dom.viewerDownloadBtn.href = file.url;
        this.dom.viewerDownloadBtn.download = file.name;
        this.dom.viewerOpenBtn.href = file.url;

        modal.classList.remove('minimized');

        const allFiles = contentContainer.querySelectorAll('.file-container');
        allFiles.forEach(el => el.classList.remove('active'));

        let currentFileContainer = document.getElementById(file.uniqueId);

        if (!currentFileContainer) {
            const newContainer = document.createElement('div');
            newContainer.id = file.uniqueId;
            newContainer.className = 'file-container active';
            contentContainer.appendChild(newContainer);

            if (file.type !== 'audio') {
                newContainer.innerHTML = '<div style="color:white">加载中...</div>';
            }

            try {
                if (file.type === 'img') {
                    newContainer.innerHTML = `
                                <div class="image-viewer-container" onwheel="app.zoomImage(event)" onmousedown="app.startDragImage(event)">
                                    <img id="viewerImage-${file.uniqueId}" src="${file.url}" style="transform: translate(0px, 0px) scale(0.9);">
                                </div>
                            `;
                } else if (file.type === 'audio') {
                    newContainer.innerHTML = this.buildAudioPlayerHTML(file);
                    this.initAudioPlayer(newContainer, file);

                } else if (file.type === 'video') {
                    let hevcWarning = '';
                    if (file.ext === 'mkv' || file.ext === 'mp4') {
                    }

                    newContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; position:relative;">
            <video id="video-${file.uniqueId}" controls autoplay crossorigin="anonymous" src="${file.url}" style="width:100%;height:auto;max-height:85vh; outline:none; background:black;">
            </video>
            ${hevcWarning}
        </div>`;

                    this.findAndLoadSubtitles(file, newContainer);

                } else if (file.type === 'txt') {
                    if (!file.content) {
                        const res = await fetch(file.url);
                        file.content = await res.text();
                    }
                    newContainer.innerHTML = `<div class="viewer-text">${file.content.replace(/</g, '&lt;')}</div>`;
                } else if (file.type === 'pdf') {
                    newContainer.innerHTML = `<iframe src="${file.url}" class="viewer-iframe"></iframe>`;
                } else {
                    newContainer.innerHTML = `
                                <div class="fallback-msg">
                                    ${this.getFileIcon(file.name, false)}
                                    <div>此文件类型 (${file.ext}) 不支持预览</div>
                                    <div class="fallback-actions">
                                        <a class="fallback-link fallback-download" href="${file.url}" download="${file.name}">立即下载</a>
                                        <a class="fallback-link fallback-open" href="${file.url}" target="_blank">在新窗口打开</a>
                                        <button class="fallback-link fallback-cancel" type="button" onclick="app.closeFile(app.state.activeFileIndex, event)">取消</button>
                                    </div>
                                </div>`;
                }
            } catch (e) { newContainer.innerHTML = `<div style="color:red">加载失败: ${e.message}</div>`; }
            currentFileContainer = newContainer;
        }

        currentFileContainer.classList.add('active');

        if (modal.classList.contains('open')) {
            modal.classList.add('open');
            return;
        }
        // 先强制回流到关闭态，再在下一帧加 .open，保证 scale/opacity 过渡能播出来
        void modal.offsetWidth;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('open');
            });
        });
    };

  app.minimizeViewer = function minimizeViewer() {
        this.dom.viewerModal.classList.add('minimized');
  };

  app.getViewerFileFullPath = function getViewerFileFullPath(item, url) {
        if (item && item.path) return this.getItemFullPath(item);
        const raw = url || (item && (item.fakeUrl || '')) || '';
        if (!raw) return '';
        try {
            return decodeURIComponent(raw).replace(/^\//, '').replace(/\//g, '\\');
        } catch (_) {
            return raw.replace(/^\//, '').replace(/\//g, '\\');
        }
    };

  app.findFilePageOffset = async function findFilePageOffset(parentPath, fileName, fullPath) {
        if (window.location.protocol === 'file:' || window.location.protocol === 'blob:') return 0;

        try {
            let query = `parent:"${parentPath}"`;
            if (!this.state.showHidden) query += ' !attrib:H';

            const scanSize = 1000;
            const pageSize = this.state.count || 100;
            let offset = 0;
            let total = Infinity;

            while (offset < total) {
                const params = new URLSearchParams({
                    search: query,
                    offset,
                    count: scanSize,
                    sort: this.state.sortCol,
                    ascending: this.state.sortAsc,
                    json: 1
                });
                const res = await fetch(`/?${params}`);
                if (!res.ok) break;
                const data = await res.json();
                const results = data.results || [];
                total = parseInt(data.totalResults) || 0;

                const idx = results.findIndex(r => {
                    const itemFull = r.path ? `${r.path}\\${r.name}` : r.name;
                    return itemFull === fullPath || r.name === fileName;
                });
                if (idx !== -1) {
                    return Math.floor((offset + idx) / pageSize) * pageSize;
                }
                if (results.length === 0) break;
                offset += results.length;
            }
        } catch (_) { /* 查询失败时回退到第一页 */ }
        return 0;
    };

  app.locateCurrentFile = async function locateCurrentFile() {
        if (this.state.activeFileIndex === -1) return;
        const file = this.state.openFiles[this.state.activeFileIndex];
        if (!file) return;

        const fullPath = file.fullPath || this.getViewerFileFullPath(null, file.url);
        if (!fullPath || !/^[a-zA-Z]:\\|^\\\\/.test(fullPath)) return;

        const idx = fullPath.lastIndexOf('\\');
        if (idx <= 0) return;
        const fileName = fullPath.slice(idx + 1);
        let parent = fullPath.slice(0, idx);
        if (/^[a-zA-Z]:$/.test(parent)) parent += '\\';

        this.minimizeViewer();
        this.state.targetFile = fileName;
        const pageOffset = await this.findFilePageOffset(parent, fileName, fullPath);
        this.navigateTo(parent, true, pageOffset);
    };

  app.getViewerExitMs = function getViewerExitMs() {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
        return 420;
  };

  app.hideViewer = function hideViewer() {
        const modal = this.dom.viewerModal;
        modal.classList.remove('open');
        modal.classList.remove('minimized');
        // 音乐模式先留着，等内容退场动画结束再撤，避免遮罩/背景闪一下
        const dropMusicMode = () => modal.classList.remove('music-mode');
        const ms = this.getViewerExitMs();
        if (ms <= 0) {
            dropMusicMode();
            return;
        }
        clearTimeout(this._viewerMusicModeTimer);
        this._viewerMusicModeTimer = setTimeout(dropMusicMode, ms);
    };

  app.closeViewer = function closeViewer() {
        this.hideViewer();
  };

  app.closeFile = function closeFile(index, e) {
        if (e) e.stopPropagation();

        const fileToRemove = this.state.openFiles[index];
        if (!fileToRemove) return;

        if (fileToRemove._audioContext) {
            if (fileToRemove._audioContext.audio) {
                fileToRemove._audioContext.audio.pause();
                fileToRemove._audioContext.audio.src = "";
            }
            if (fileToRemove._audioContext.close) {
                fileToRemove._audioContext.close();
            }
        }

        const containerToRemove = document.getElementById(fileToRemove.uniqueId);
        this.state.openFiles.splice(index, 1);

        if (this.state.openFiles.length > 0) {
            if (index === this.state.activeFileIndex) {
                this.state.activeFileIndex = Math.max(0, index - 1);
            } else if (index < this.state.activeFileIndex) {
                this.state.activeFileIndex--;
            }
            this.renderTaskBar();
            if (containerToRemove) containerToRemove.remove();
            this.hideViewer();
            return;
        }

        this.state.activeFileIndex = -1;
        this.renderTaskBar();
        // 最后一关：先播退出动画，结束后再拆播放器 DOM
        this.hideViewer();
        const ms = this.getViewerExitMs();
        if (ms <= 0) {
            if (containerToRemove) containerToRemove.remove();
            return;
        }
        clearTimeout(this._viewerRemoveTimer);
        this._viewerRemoveTimer = setTimeout(() => {
            if (containerToRemove) containerToRemove.remove();
        }, ms);
    };

  app.renderTaskBar = function renderTaskBar() {
        const bar = this.dom.taskBar;
        if (this.state.openFiles.length === 0) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = 'flex';

        let html = '';
        this.state.openFiles.forEach((file, idx) => {
            const activeClass = idx === this.state.activeFileIndex ? 'active' : '';
            html += `
                        <div class="task-item ${activeClass}" onclick="app.activateFile(${idx})" title="${file.name}">
                            <div class="task-name">${file.name}</div>
                            <div class="task-close" onclick="app.closeFile(${idx}, event)">${svg_close}</div>
                        </div>
                    `;
        });
        bar.innerHTML = html;
    };

  app.zoomImage = function zoomImage(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.state.imageZoom *= delta;
        this.updateImageTransform();
    };

  app.startDragImage = function startDragImage(e) {
        e.preventDefault();
        const startX = e.clientX - this.state.imagePos.x;
        const startY = e.clientY - this.state.imagePos.y;
        const onMove = (moveEvent) => {
            this.state.imagePos.x = moveEvent.clientX - startX;
            this.state.imagePos.y = moveEvent.clientY - startY;
            this.updateImageTransform();
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

  app.updateImageTransform = function updateImageTransform() {
        if (this.state.activeFileIndex === -1) return;
        const file = this.state.openFiles[this.state.activeFileIndex];
        const img = document.getElementById(`viewerImage-${file.uniqueId}`);
        if (img) img.style.transform = `translate(${this.state.imagePos.x}px, ${this.state.imagePos.y}px) scale(${this.state.imageZoom})`;
    };

}
