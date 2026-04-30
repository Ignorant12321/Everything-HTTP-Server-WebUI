// Everything API：封装磁盘加载、文件查询和预览 URL 构造。

function attachApiMethods(app) {

  app.loadDrives = async function loadDrives() {
        try {
            if (window.location.protocol === 'file:' || window.location.protocol === 'blob:') throw new Error('DEMO');

            const res = await fetch(`/?search=root:&json=1&count=100`);
            const data = await res.json(); // 解析接口返回的JSON数据

            let html = '';
            (data.results || []).forEach(d => {
                const path = d.name.endsWith(':') ? d.name + '\\' : d.name;
                const label = d.name.endsWith(':') ? `Disk: ${d.name.charAt(0)}` : d.name;
                html += `<div class="sidebar-item" onclick="app.navigateTo('${path.replace(/\\/g, '\\\\')}', true)"><span class="file-icon" style="font-size:16px">${svg_disk}</span> ${label}</div>`;
            });
            this.dom.driveList.innerHTML = html;
        } catch (e) {
            if (e.message !== 'DEMO') console.error(e);
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
  };

}
