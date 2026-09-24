// Everything API：封装磁盘加载、文件查询和预览 URL 构造。

function attachApiMethods(app) {
  app.isFolderItem = function isFolderItem(item) {
        return (!item.size && item.size !== 0) || item.type === 'folder' || item.isFolder;
  };

  app.getItemFullPath = function getItemFullPath(item) {
        return item.path ? `${item.path}\\${item.name}` : item.name;
  };

  app.loadDrives = async function loadDrives() {
        try {
            if (window.location.protocol === 'file:' || window.location.protocol === 'blob:') throw new Error('DEMO');

            const res = await fetch(`/?search=root:&json=1&count=100&sort=name&ascending=1`);
            const data = await res.json(); // 解析接口返回的JSON数据

            let html = '';
            const drives = (data.results || []).slice().sort((a, b) =>
                String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' })
            );
            drives.forEach(d => {
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

  app.normalizePathProbe = function normalizePathProbe(p) {
        if (/^[a-zA-Z]:\\$/.test(p)) return p;
        if (/^[a-zA-Z]:$/.test(p)) return p + '\\';
        return p.replace(/\\+$/, '');
    };

  // 探测路径是否存在：返回 'folder' | 'file' | 'search'；探测失败返回 null
  app.probePathKind = async function probePathKind(path) {
        try {
            const normalized = this.normalizePathProbe(path);
            const params = new URLSearchParams({
                search: `"${normalized}"`,
                json: 1,
                count: 5,
                path_column: 1
            });
            const res = await fetch(`/?${params}`);
            if (!res.ok) return null;
            const data = await res.json();
            const results = data.results || [];
            const target = normalized.toLowerCase();
            for (const item of results) {
                const full = this.getItemFullPath(item).toLowerCase();
                if (full !== target && full !== target + '\\') continue;
                return this.isFolderItem(item) ? 'folder' : 'file';
            }
            return 'search';
        } catch (_) {
            return null;
        }
    };

  app.fetchData = async function fetchData(isExplicitFolder) {
        const list = this.dom.list;
        // 快返回时不闪“加载中”，慢请求再替换，避免内容→spinner→内容 的一闪
        clearTimeout(this._fetchLoadingTimer);
        this._fetchLoadingTimer = setTimeout(() => {
            list.innerHTML = `<div class="center-msg"><svg class="loading-icon" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><use href="#icon-spinner"></use></svg><span>加载中...</span></div>`;
        }, 160);
        try {
            if (window.location.protocol === 'file:' || window.location.protocol === 'blob:') throw new Error('DEMO');

            let query = this.state.currentPath;
            const isDriveRoot = query === 'root:';

            if (isDriveRoot) {
                // 盘符列表：与 loadDrives 保持一致，附加 !attrib:H 会得到空结果
            } else if (isExplicitFolder) {
                query = `parent:"${query}"`;
            } else if (/^[a-zA-Z]:\\|^\\\\/.test(query)) {
                if (/^[a-zA-Z]:\\$/.test(query)) {
                    query = `parent:"${query}"`;
                } else {
                    const kind = await this.probePathKind(query);
                    if (kind === null) {
                        // 探测失败：回退旧启发式，避免路径导航完全失效
                        const knownExts = ['exe', 'jpg', 'png', 'txt', 'mp3', 'mp4', 'pdf', 'doc', 'docx', 'zip', 'rar', 'lrc'];
                        const ext = query.split('.').pop().toLowerCase();
                        if (knownExts.includes(ext) && query.split('\\').pop().includes('.')) {
                            query = `"${query}"`;
                        } else {
                            query = `parent:"${query}"`;
                        }
                    } else if (kind === 'folder') {
                        query = `parent:"${this.normalizePathProbe(query)}"`;
                    } else if (kind === 'file') {
                        query = `"${this.normalizePathProbe(query)}"`;
                    }
                    // kind === 'search'：不存在的路径，原样透传（支持空格 AND、regex:、通配符等）
                }
            }
            // 非路径形态的输入（regex:*.png 等）本就原样透传

            if (!isDriveRoot && !this.state.showHidden) query += ' !attrib:H';

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
            clearTimeout(this._fetchLoadingTimer);
            this.state.items = data.results || [];
            this.state.total = parseInt(data.totalResults) || 0;
            this.renderList();
            this.updatePagination();
        } catch (e) {
            clearTimeout(this._fetchLoadingTimer);
            if (e.message === 'DEMO') this.mockData();
            else list.innerHTML = `<div class="center-msg" style="color:red">连接失败</div>`;
        }
    };

  app.getFileUrl = function getFileUrl(item) {
        const full = this.getItemFullPath(item);
        return `/${full.replace(/\\/g, '/')}`;
    };

  app.fetchFolderChildren = async function fetchFolderChildren(folderPath, fetchImpl = fetch) {
        const count = 1000;
        let offset = 0;
        let total = Infinity;
        const items = [];

        while (offset < total) {
            let query = `parent:"${folderPath}"`;
            if (!this.state.showHidden) query += ' !attrib:H';

            const params = new URLSearchParams({
                search: query,
                offset,
                count,
                sort: 'name',
                ascending: 1,
                json: 1,
                path_column: 1,
                size_column: 1,
                date_modified_column: 1
            });

            const response = await fetchImpl(`/?${params}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const results = data.results || [];
            items.push(...results);
            total = parseInt(data.totalResults) || results.length;
            if (results.length === 0) break;
            offset += results.length;
        }

        return items;
  };

  app.saveFolderToDirectory = async function saveFolderToDirectory(folderPath, destinationHandle, fetchImpl = fetch) {
        const safeName = (name) => name.replace(/[<>:"/\\|?*]/g, '_') || 'folder';
        const rootName = safeName(folderPath.split('\\').filter(Boolean).pop() || 'folder');
        const rootHandle = await destinationHandle.getDirectoryHandle(rootName, { create: true });

        const copyFolder = async (currentPath, targetHandle) => {
            const children = await this.fetchFolderChildren(currentPath, fetchImpl);
            for (const child of children) {
                const childPath = this.getItemFullPath(child);
                if (this.isFolderItem(child)) {
                    const childHandle = await targetHandle.getDirectoryHandle(safeName(child.name), { create: true });
                    await copyFolder(childPath, childHandle);
                    continue;
                }

                const response = await fetchImpl(this.getFileUrl(child));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const writable = await targetHandle.getFileHandle(safeName(child.name), { create: true })
                    .then((fileHandle) => fileHandle.createWritable());
                await writable.write(new Uint8Array(await response.arrayBuffer()));
                await writable.close();
            }
        };

        await copyFolder(folderPath, rootHandle);
  };

  app.downloadFolderToDirectory = async function downloadFolderToDirectory(item) {
        if (!window.showDirectoryPicker) {
            this.showToast('当前浏览器不支持直接下载文件夹');
            return;
        }

        try {
            const destinationHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            this.showToast('正在下载文件夹...');
            await this.saveFolderToDirectory(this.getItemFullPath(item), destinationHandle);
            this.showToast('文件夹下载完成');
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            console.error(error);
            this.showToast('文件夹下载失败');
        }
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
