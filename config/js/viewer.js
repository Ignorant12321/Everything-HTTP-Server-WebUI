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
            uniqueId: 'file-' + Date.now()
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

        this.state.imageZoom = 1; this.state.imagePos = { x: 0, y: 0 };
        this.dom.viewerTitle.textContent = file.name;
        this.dom.viewerDownloadBtn.href = file.url;
        this.dom.viewerDownloadBtn.download = file.name;
        this.dom.viewerOpenBtn.href = file.url;

        modal.classList.remove('minimized');
        modal.classList.add('open');

        const allFiles = contentContainer.querySelectorAll('.file-container');
        allFiles.forEach(el => el.classList.remove('active'));

        let currentFileContainer = document.getElementById(file.uniqueId);

        if (currentFileContainer) {
            currentFileContainer.classList.add('active');
            return;
        }

        const newContainer = document.createElement('div');
        newContainer.id = file.uniqueId;
        newContainer.className = 'file-container active';
        contentContainer.appendChild(newContainer);

        newContainer.innerHTML = '<div style="color:white">加载中...</div>';

        try {
            if (file.type === 'img') {
                newContainer.innerHTML = `
                            <div class="image-viewer-container" onwheel="app.zoomImage(event)" onmousedown="app.startDragImage(event)">
                                <img id="viewerImage-${file.uniqueId}" src="${file.url}" style="transform: translate(0px, 0px) scale(1);">
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
                                <div style="font-size:48px;margin-bottom:10px">📄</div>
                                <div>此文件类型 (${file.ext}) 不支持预览</div>
                                <a class="fallback-link" href="${file.url}" target="_blank">在新窗口打开</a>
                            </div>`;
            }
        } catch (e) { newContainer.innerHTML = `<div style="color:red">加载失败: ${e.message}</div>`; }
  };

  app.minimizeViewer = function minimizeViewer() {
        this.dom.viewerModal.classList.add('minimized');
  };

  app.hideViewer = function hideViewer() {
        this.dom.viewerModal.classList.remove('open');
        this.dom.viewerModal.classList.remove('minimized');
        this.dom.viewerModal.classList.remove('music-mode');
    };

  app.closeViewer = function closeViewer() {
        this.hideViewer();
  };

  app.closeFile = function closeFile(index, e) {
        if (e) e.stopPropagation();

        const fileToRemove = this.state.openFiles[index];

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
        if (containerToRemove) containerToRemove.remove();

        this.state.openFiles.splice(index, 1);

        if (this.state.openFiles.length > 0) {
            if (index === this.state.activeFileIndex) {
                const newIndex = Math.max(0, index - 1);
                this.activateFile(newIndex);
            } else if (index < this.state.activeFileIndex) {
                this.state.activeFileIndex--;
                this.renderTaskBar();
            } else {
                this.renderTaskBar();
            }
            this.hideViewer();
        } else {
            this.state.activeFileIndex = -1;
            this.renderTaskBar();
            this.hideViewer();
        }
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
