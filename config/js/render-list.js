// 文件列表模块：渲染表头、列表、网格视图和选中态。

import { svg_disk, svg_favorite_filled, svg_favorite_outline, svg_play, svg_pause, svg_loop_none, svg_loop_single, svg_loop_list, svg_shuffle_list, svg_fullscreen, svg_close, svg_volume, svg_volume_mute } from './icons.js';



export function attachRenderListMethods(app) {

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
    },

    // --- 核心导航逻辑 ---;

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
            // 核心优化：根据 index 设置延迟，最大延迟 0.2s 避免太慢
            div.style.animationDelay = `${Math.min(index * 0.03, 0.2)}s`;
            if (this.state.selectedItem === item) div.classList.add('selected');

            if (this.state.targetFile && item.name === this.state.targetFile) {
                div.classList.add('selected');
                this.state.selectedItem = item;
                this.renderDetails(item);
                targetEl = div;
            }
            // 核心交互逻辑更新
            let longPressTimer;
            const startLongPress = () => {
                longPressTimer = setTimeout(() => {
                    // 长按逻辑：显示详情
                    this.selectItem(index);
                    this.dom.details.classList.add('active'); // 强制呼出详情
                    // 可能需要震动反馈 navigator.vibrate(50)
                }, 500);
            };
            const clearLongPress = () => {
                if (longPressTimer) clearTimeout(longPressTimer);
            };

            // 绑定触摸事件
            div.addEventListener('touchstart', (e) => {
                // 不阻止默认，否则无法滚动
                startLongPress();
            }, { passive: true });

            div.addEventListener('touchend', clearLongPress);
            div.addEventListener('touchmove', clearLongPress);


            div.onclick = (e) => {
                e.stopPropagation();

                if (window.innerWidth <= 768) {
                    // 移动端逻辑
                    if (isDir) {
                        // 单击文件夹：打开
                        const next = item.path ? `${item.path}\\${item.name}` : item.name;
                        this.navigateTo(next, true);
                    } else {
                        // 单击文件：仅选中，不操作，不自动弹出详情（长按才弹出）
                        this.selectItem(index);
                    }
                } else {
                    // PC端逻辑 (保持原样: 单击选中+详情)
                    this.selectItem(index);
                    // PC端详情面板是常驻或跟随的，不需要特殊 toggle
                    if (this.state.viewMode === 'list') {
                        // this.dom.details.classList.add('active');
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
        if (isDir) return '📁';
        const ext = name.split('.').pop().toLowerCase();
        const map = {
            '🖼️': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
            '🎵': ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
            '🎬': ['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi'],
            '📦': ['zip', 'rar', '7z', 'tar', 'gz', 'iso'],
            '📝': ['txt', 'md', 'js', 'css', 'html', 'json', 'xml', 'log', 'c', 'cpp', 'h', 'java', 'py', 'rs', 'go', 'ts', 'tsx', 'ini', 'bat', 'sh', 'lrc', 'srt', 'vtt'],
            '📙': ['pdf'],
            '🚀': ['exe', 'msi']
        };
        for (let icon in map) {
            if (map[icon].includes(ext)) return icon;
        }
        return '📄';
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
