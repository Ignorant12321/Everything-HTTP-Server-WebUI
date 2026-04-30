// Everything API：封装磁盘加载、文件查询和预览 URL 构造。

import { svg_disk, svg_favorite_filled, svg_favorite_outline, svg_play, svg_pause, svg_loop_none, svg_loop_single, svg_loop_list, svg_shuffle_list, svg_fullscreen, svg_close, svg_volume, svg_volume_mute } from './icons.js';



export function attachApiMethods(app) {

  app.loadDrives = async function loadDrives() {
        try {
            // 本地文件协议(file:)或Blob协议下，直接抛出DEMO异常（避免接口请求）
            if (window.location.protocol === 'file:' || window.location.protocol === 'blob:') throw new Error('DEMO');

            // 异步请求后端接口，获取根目录（磁盘列表）数据
            // 请求参数：search=root: 表示查询根驱动器，json=1 返回JSON格式，count=100 限制返回数量
            const res = await fetch(`/?search=root:&json=1&count=100`);
            const data = await res.json(); // 解析接口返回的JSON数据

            // 拼接磁盘列表的HTML字符串
            let html = '';
            // 遍历磁盘列表（兼容无数据的情况：data.results为空则遍历空数组）
            (data.results || []).forEach(d => {
                // 处理磁盘路径：盘符结尾加反斜杠（如C: → C:\），非盘符保持原路径
                const path = d.name.endsWith(':') ? d.name + '\\' : d.name;
                // 处理磁盘显示标签：盘符显示为「Disk: 盘符」（如C: → Disk: C），非盘符显示原名
                const label = d.name.endsWith(':') ? `Disk: ${d.name.charAt(0)}` : d.name;
                // 拼接单个磁盘项的HTML：
                html += `<div class="sidebar-item" onclick="app.navigateTo('${path.replace(/\\/g, '\\\\')}', true)"><span class="file-icon" style="font-size:16px">${svg_disk}</span> ${label}</div>`;
            });
            // 将拼接好的HTML渲染到侧边栏磁盘列表容器
            this.dom.driveList.innerHTML = html;
        } catch (e) {
            // 异常处理：仅当不是DEMO异常时打印错误（避免本地调试时的无用报错）
            if (e.message !== 'DEMO') console.error(e);
            // 渲染默认的C盘项（本地调试/请求失败时的兜底方案）
            this.dom.driveList.innerHTML = `<div class="sidebar-item" onclick="app.navigateTo('C:\\\\', true)"><span class="file-icon">${svg_disk}</span> Disk: C</div>`;
        }
    };

  app.fetchData = async function fetchData(isExplicitFolder) {
        this.dom.list.innerHTML = `<div class="center-msg">⏳ 加载中...</div>`;
        try {
            if (window.location.protocol === 'file:' || window.location.protocol === 'blob:') throw new Error('DEMO');

            let query = this.state.currentPath;

            if (query === 'root:') {
            } else if (isExplicitFolder) {
                query = `parent:"${query}"`;
            } else {
                if (/^[a-zA-Z]:\\|^\\\\/.test(query)) {
                    const knownExts = ['exe', 'jpg', 'png', 'txt', 'mp3', 'mp4', 'pdf', 'doc', 'docx', 'zip', 'rar', 'lrc'];
                    const ext = query.split('.').pop().toLowerCase();
                    if (knownExts.includes(ext) && query.split('\\').pop().includes('.')) {
                        query = `"${query}"`;
                    } else {
                        query = `parent:"${query}"`;
                    }
                }
            }

            if (!this.state.showHidden) query += ' !attrib:H';

            const params = new URLSearchParams({
                search: query,
                offset: this.state.offset,
                count: this.state.count,
                sort: this.state.sortCol,
                ascending: this.state.sortAsc,
                json: 1,
                path_column: 1,
                size_column: 1,
                date_modified_column: 1
            });

            const res = await fetch(`/?${params}`);
            const data = await res.json();
            this.state.items = data.results || [];
            this.state.total = parseInt(data.totalResults) || 0;
            this.renderList();
            this.updatePagination();
        } catch (e) {
            if (e.message === 'DEMO') this.mockData();
            else this.dom.list.innerHTML = `<div class="center-msg" style="color:red">连接失败</div>`;
        }
    };

  app.getFileUrl = function getFileUrl(item) {
        const full = item.path ? `${item.path}\\${item.name}` : item.name;
        return `/${full.replace(/\\/g, '/')}`;
    };

  app.mockData = function mockData() {
        this.state.items = [
            { name: 'C:', type: 'folder', path: '', size: undefined, date_modified: undefined },
            { name: 'Photo.jpg', path: 'D:\\Data', size: 2500000, date_modified: '133494000000000000' },
            { name: 'Song.lrc', path: 'D:\\Music', size: 1024, date_modified: 1672531200000 },
            { name: 'Example Song.mp3', path: 'D:\\Music', size: 5242880, date_modified: 1672531200000 },
            { name: 'MyVideo.mp4', path: 'D:\\Videos', size: 124288022, date_modified: 1672531200000 },
            { name: 'MyVideo.vtt', path: 'D:\\Videos', size: 1024, date_modified: 1672531200000 }
        ];
        this.state.total = 6;
        this.renderList();
        this.updatePagination();
    },

    // --- 【新增】辅助：获取图片平均色 ---;

}
