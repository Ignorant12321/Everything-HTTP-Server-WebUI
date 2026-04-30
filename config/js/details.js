// 详情模块：渲染属性面板、复制属性、下载和文件类型判断。

import { svg_disk, svg_favorite_filled, svg_favorite_outline, svg_play, svg_pause, svg_loop_none, svg_loop_single, svg_loop_list, svg_shuffle_list, svg_fullscreen, svg_close, svg_volume, svg_volume_mute } from './icons.js';



export function attachDetailsMethods(app) {

  app.renderDetails = function renderDetails(item) {
        const pane = this.dom.details;
        if (!item) { pane.classList.remove('active'); pane.style.transform = ''; return; }

        if (window.innerWidth > 768) {
            pane.classList.add('active');
        } else {
            // 移动端保持原状，除非手动激活
            // pane.classList.add('active');
            // pane.style.transform = '';
        }

        const isDir = (!item.size && item.size !== 0);
        const icon = this.getFileIcon(item.name, isDir);
        const fakeUrl = item.fakeUrl || this.getFileUrl(item); // Support favorites
        const ext = item.name.split('.').pop().toLowerCase();
        const imgs = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

        if (!isDir && imgs.includes(ext)) {
            this.dom.previewBox.innerHTML = `<img src="${fakeUrl}" class="preview-img">`;
            this.dom.detailIcon.innerHTML = `<img src="${fakeUrl}">`;
        } else {
            this.dom.previewBox.innerHTML = icon;
            this.dom.detailIcon.innerHTML = icon;
            this.dom.detailIcon.style.display = 'flex';
            this.dom.detailIcon.style.alignItems = 'center';
            this.dom.detailIcon.style.justifyContent = 'center';
            this.dom.detailIcon.style.fontSize = '18px';
        }
        if (window.innerWidth > 768) {
            this.dom.detailIcon.innerHTML = icon;
            this.dom.detailIcon.style.display = 'flex';
            this.dom.detailIcon.style.alignItems = 'center';
            this.dom.detailIcon.style.justifyContent = 'center';
            this.dom.detailIcon.style.fontSize = '18px';
        }

        document.getElementById('detailName').textContent = item.name;

        // 更新详情页心形图标状态
        const favBtn = document.getElementById('detailFavBtn');
        const isFav = this.state.favorites.some(f => f.url === fakeUrl);
        if (isFav) {
            favBtn.innerHTML = svg_favorite_filled;
        } else {
            favBtn.innerHTML = svg_favorite_outline;
        }


        const renderValue = (id, val) => {
            const el = document.getElementById(id);
            el.textContent = val;
            if (this.state.enableCopy) {
                el.classList.add('copyable');
                el.onclick = () => this.copyText(val);
                el.title = "点击复制";
            } else {
                el.classList.remove('copyable');
                el.onclick = null;
                el.title = "";
            }
        };

        // 分离位置和完整路径
        const locationPath = item.path || 'Root';
        const fullPath = item.path ? `${item.path}\\${item.name}` : item.name;

        renderValue('detailLocation', locationPath);
        renderValue('detailPath', fullPath);
        renderValue('detailType', isDir ? '文件夹' : (ext.toUpperCase() + ' 文件'));

        const dateVal = item.date_modified || item.dm || item.dateModified;
        renderValue('detailDate', this.parseDate(dateVal));

        renderValue('detailSize', isDir ? '-' : this.formatSize(item.size));
    };

  app.closeDetails = function closeDetails() {
        this.dom.details.classList.remove('active');
        this.dom.details.style.transform = '';
    };

  app.copyText = function copyText(text) {
        // 优先使用 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('已复制内容');
            }).catch(() => {
                this.fallbackCopyText(text); // 失败时回退
            });
        } else {
            this.fallbackCopyText(text);
        }
    };

  app.fallbackCopyText = function fallbackCopyText(text) {
        // 回退方案：创建隐藏输入框选中文本执行 copy 命令
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";  // 避免滚动
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            this.showToast('已复制内容');
        } catch (err) {
            this.showToast('复制失败');
        }
        document.body.removeChild(textArea);
    };

  app.showToast = function showToast(msg) {
        const t = this.dom.toast;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
    };

  app.handleOpenAction = function handleOpenAction(item) {
        const url = item.fakeUrl || this.getFileUrl(item);
        if (this.state.openMethod === 'newWindow') {
            window.open(url, '_blank');
        } else {
            this.openOverlay(item);
        }
    };

  app.triggerDownload = function triggerDownload(item) {
        const link = document.createElement('a');
        link.href = item.fakeUrl || this.getFileUrl(item);
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // --- 预览窗口逻辑 ---;

  app.getFileType = function getFileType(ext) {
        const types = {
            img: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
            audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
            video: ['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi'],
            txt: ['txt', 'md', 'js', 'css', 'html', 'json', 'log', 'ini', 'bat', 'sh', 'c', 'cpp', 'h', 'java', 'py', 'rs', 'go', 'ts', 'tsx', 'lrc', 'srt', 'vtt', 'xml', 'yaml'],
            pdf: ['pdf']
        };
        for (const t in types) if (types[t].includes(ext)) return t;
        return 'unknown';
    };

}
