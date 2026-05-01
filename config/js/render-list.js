// 文件列表模块：渲染表头、列表、网格视图和选中态。

function attachRenderListMethods(app) {
  app.buildFileIcon = function buildFileIcon(kind, label, body) {
        return `
            <svg class="file-type-icon file-icon-${kind}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                <rect class="file-icon-shadow" x="7" y="5" width="34" height="38" rx="9"></rect>
                <rect class="file-icon-bg" x="6" y="4" width="34" height="38" rx="9"></rect>
                <path class="file-icon-fold" d="M30 4h2.5L40 11.5V14h-7a3 3 0 0 1-3-3V4z"></path>
                ${body}
                <text class="file-icon-label" x="38" y="39" text-anchor="end">${label}</text>
            </svg>`;
  };

  app.renderHeader = function renderHeader() {
        this.dom.header.innerHTML = '';
        this.state.columns.forEach((col, idx) => {
            const cell = document.createElement('div');
            cell.className = 'header-cell';
            cell.style.width = col.width + 'px';
            if (col.grow) cell.style.flex = '1';

            const span = document.createElement('span');
            span.textContent = col.label;
            cell.appendChild(span);

            if (col.id !== 'icon') {
                cell.onclick = () => app.sort(col.id === 'type' ? 'extension' : (col.id === 'date' ? 'date_modified' : col.id));
            }

            if (col.resize) {
                const handle = document.createElement('div');
                handle.className = 'resize-handle';
                handle.onmousedown = (e) => { e.stopPropagation(); this.startResize(e, idx); };
                handle.onclick = (e) => e.stopPropagation();
                cell.appendChild(handle);
            }
            this.dom.header.appendChild(cell);
        });
    };

  app.startResize = function startResize(e, colIndex) {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = this.state.columns[colIndex].width;
        if (this.state.columns[colIndex].grow) {
            const cell = this.dom.header.children[colIndex];
            const rect = cell.getBoundingClientRect();
            this.state.columns[colIndex].grow = false;
            this.state.columns[colIndex].width = rect.width;
        }
        document.body.style.cursor = 'col-resize';
        const onMove = (moveEvent) => {
            const diff = moveEvent.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff);
            this.state.columns[colIndex].width = newWidth;
            this.renderHeader();
            this.renderList();
        };
        const onUp = () => {
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
  };

  app.renderList = function renderList() {
        const list = this.dom.list;
        list.innerHTML = '';
        if (this.state.items.length === 0) {
            list.innerHTML = `<div class="center-msg">无结果</div>`;
            return;
        }

        const isGrid = this.state.viewMode === 'grid';
        let targetEl = null;

        this.state.items.forEach((item, index) => {
            const isDir = (!item.size && item.size !== 0) || item.type === 'folder';

            const div = document.createElement('div');
            div.className = 'file-row anim-entry'; // 添加 anim-entry 类
            div.style.animationDelay = `${Math.min(index * 0.03, 0.2)}s`;
            if (this.state.selectedItem === item) div.classList.add('selected');

            if (this.state.targetFile && item.name === this.state.targetFile) {
                div.classList.add('selected');
                this.state.selectedItem = item;
                this.renderDetails(item);
                targetEl = div;
            }
            let longPressTimer;
            const startLongPress = () => {
                longPressTimer = setTimeout(() => {
                    this.selectItem(index);
                    this.dom.details.classList.add('active'); // 强制呼出详情
                }, 500);
            };
            const clearLongPress = () => {
                if (longPressTimer) clearTimeout(longPressTimer);
            };

            div.addEventListener('touchstart', (e) => {
                startLongPress();
            }, { passive: true });

            div.addEventListener('touchend', clearLongPress);
            div.addEventListener('touchmove', clearLongPress);

            div.onclick = (e) => {
                e.stopPropagation();

                if (window.innerWidth <= 768) {
                    if (isDir) {
                        const next = item.path ? `${item.path}\\${item.name}` : item.name;
                        this.navigateTo(next, true);
                    } else {
                        this.selectItem(index);
                    }
                } else {
                    this.selectItem(index);
                    if (this.state.viewMode === 'list') {
                    }
                }
            };

            div.ondblclick = (e) => {
                e.stopPropagation();
                if (isDir) {
                    const next = item.path ? `${item.path}\\${item.name}` : item.name;
                    this.navigateTo(next, true);
                } else {
                    this.handleOpenAction(item);
                }
            };

            const icon = this.getFileIcon(item.name, isDir);
            const sizeStr = isDir ? '' : this.formatSize(item.size);
            const dateVal = item.date_modified || item.dm || item.dateModified;
            const dateStr = this.parseDate(dateVal);
            const ext = isDir ? '文件夹' : (item.name.split('.').pop().toUpperCase() + ' 文件');

            if (isGrid) {
                div.innerHTML = `<div class="cell-icon">${icon}</div><div class="cell-name" title="${item.name}">${item.name}</div>`;
            } else {
                div.innerHTML = `
                            <div class="cell" style="width:${this.state.columns[0].width}px"><span class="cell-icon" style="font-size:18px">${icon}</span></div>
                            <div class="cell cell-name" style="width:${this.state.columns[1].width}px; ${this.state.columns[1].grow ? 'flex:1' : ''}">${item.name}</div>
                            <div class="cell cell-type" style="width:${this.state.columns[2].width}px">${ext}</div>
                            <div class="cell cell-meta" style="width:${this.state.columns[3].width}px">${sizeStr}</div>
                            <div class="cell cell-meta" style="width:${this.state.columns[4].width}px">${dateStr}</div>
                        `;
            }
            list.appendChild(div);
        });

        if (targetEl) {
            targetEl.scrollIntoView({ block: 'center' });
            this.state.targetFile = null;
        }
    };

  app.getFileIcon = function getFileIcon(name, isDir) {
        if (isDir) {
            return `
                <svg class="file-type-icon file-icon-folder" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                    <path class="folder-back" d="M5 16a6 6 0 0 1 6-6h10l4 5h12a6 6 0 0 1 6 6v3H5v-8z"></path>
                    <path class="folder-front" d="M5 21h38l-3.2 16.5A6 6 0 0 1 34 42H10a6 6 0 0 1-5.9-7.1L5 21z"></path>
                    <path class="folder-line" d="M9 24h30"></path>
                </svg>`;
        }
        const ext = name.split('.').pop().toLowerCase();
        const map = {
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'],
            audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
            video: ['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi', 'wmv'],
            archive: ['zip', 'rar', '7z', 'tar', 'gz', 'iso', 'bz2', 'xz'],
            code: ['txt', 'md', 'js', 'css', 'html', 'json', 'xml', 'log', 'c', 'cpp', 'h', 'java', 'py', 'rs', 'go', 'ts', 'tsx', 'ini', 'bat', 'sh', 'lrc', 'srt', 'vtt', 'yaml', 'yml'],
            pdf: ['pdf'],
            program: ['exe', 'msi', 'app', 'apk'],
            sheet: ['xls', 'xlsx', 'csv', 'tsv'],
            doc: ['doc', 'docx', 'ppt', 'pptx']
        };
        let kind = 'generic';
        for (let iconKind in map) {
            if (map[iconKind].includes(ext)) {
                kind = iconKind;
                break;
            }
        }
        const bodies = {
            image: '<circle class="file-icon-mark" cx="17" cy="18" r="3.2"></circle><path class="file-icon-mark" d="M12 28l6.2-6.5 4.3 4.6 3.2-3.2L34 32H12v-4z"></path>',
            audio: '<path class="file-icon-mark" d="M27 14v14.2a4.5 4.5 0 1 1-2.6-4.1V16.7l9-2.2v4.1L27 20.2z"></path>',
            video: '<path class="file-icon-mark" d="M13 16h17a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3zm7 4v8l7-4-7-4z"></path>',
            archive: '<path class="file-icon-mark" d="M16 14h14a4 4 0 0 1 4 4v3H12v-3a4 4 0 0 1 4-4zm-4 9h22v6a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4v-6z"></path><path class="file-icon-cut" d="M21 14v19M25 14v19"></path>',
            code: '<path class="file-icon-cut" d="M18.5 18l-5 5 5 5M27.5 18l5 5-5 5M25 16l-4 14"></path>',
            pdf: '<path class="file-icon-mark" d="M13 26c5-2 7-6 8-12 2 8 5 12 12 13-7 1-14 2-20-1z"></path><path class="file-icon-cut" d="M15 26c5 3 11 2 18 1"></path>',
            program: '<rect class="file-icon-mark" x="13" y="15" width="20" height="15" rx="3"></rect><path class="file-icon-cut" d="M17 20h12M17 25h7"></path>',
            sheet: '<path class="file-icon-cut" d="M13 17h20M13 22h20M13 27h20M19 14v18M26 14v18"></path>',
            doc: '<path class="file-icon-cut" d="M14 17h18M14 22h18M14 27h12"></path>',
            generic: '<path class="file-icon-cut" d="M14 18h18M14 24h18M14 30h10"></path>'
        };
        const labels = {
            image: 'IMG',
            audio: 'AUD',
            video: 'VID',
            archive: 'ZIP',
            code: 'DEV',
            pdf: 'PDF',
            program: 'APP',
            sheet: 'XLS',
            doc: 'DOC',
            generic: ext ? ext.slice(0, 3).toUpperCase() : 'FILE'
        };
        return this.buildFileIcon(kind, labels[kind], bodies[kind]);
    };

  app.selectItem = function selectItem(index) {
        const rows = this.dom.list.children;
        for (let row of rows) row.classList.remove('selected');
        if (index !== null && rows[index]) {
            rows[index].classList.add('selected');
            const item = this.state.items[index];
            this.state.selectedItem = item;
            this.renderDetails(item);
        } else {
            this.state.selectedItem = null;
            this.renderDetails(null);
            if (window.innerWidth <= 768) this.closeDetails();
        }
    };

  app.bgClick = function bgClick(e) { if (e.target === this.dom.list) this.selectItem(null); };

}
