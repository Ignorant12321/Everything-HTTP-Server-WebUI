// 导航模块：维护路径、历史记录、分页和排序。



export function attachNavigationMethods(app) {

  app.navigateTo = function navigateTo(path, isExplicitFolder = false) {
        path = path ? path.replace(/^"|"$/g, '').trim() : '';

        if (path === '') {
            this.state.currentPath = this.config.defaultPath;
            path = this.config.defaultPath;
        }

        if (!this.state.isNavigatingHistory) {
            if (this.state.historyIndex < this.state.history.length - 1) {
                this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
            }
            if (this.state.history[this.state.historyIndex] !== path) {
                this.state.history.push(path);
                this.state.historyIndex++;
            }
        }

        this.state.currentPath = path;
        this.state.offset = 0;
        this.dom.address.value = path;
        this.state.selectedItem = null;
        this.renderDetails(null);
        document.getElementById('btnBack').disabled = this.state.historyIndex <= 0;
        document.getElementById('btnForward').disabled = this.state.historyIndex >= this.state.history.length - 1;

        this.fetchData(isExplicitFolder);
        this.state.isNavigatingHistory = false;
    };

  app.goBack = function goBack() {
        if (this.state.historyIndex > 0) {
            this.state.historyIndex--;
            this.state.isNavigatingHistory = true;
            this.navigateTo(this.state.history[this.state.historyIndex], true);
        }
    };

  app.goForward = function goForward() {
        if (this.state.historyIndex < this.state.history.length - 1) {
            this.state.historyIndex++;
            this.state.isNavigatingHistory = true;
            this.navigateTo(this.state.history[this.state.historyIndex], true);
        }
    };

  app.goUp = function goUp() {
        if (!this.state.currentPath || !/^[a-zA-Z]:\\|^\\\\/.test(this.state.currentPath)) {
            this.navigateTo(''); return;
        }
        const parts = this.state.currentPath.split('\\');
        while (parts.length && !parts[parts.length - 1]) parts.pop();
        parts.pop();
        if (parts.length === 0) { this.navigateTo(''); return; }
        let parent = parts.join('\\');
        if (/^[a-zA-Z]:$/.test(parent)) parent += '\\';
        this.navigateTo(parent, true); // 向上一定是进入文件夹
    };

  app.refresh = function refresh() {
        btnRefresh.classList.add('anim-rotate');
        setTimeout(() => {
            btnRefresh.classList.remove('anim-rotate');
        }, 500);
        this.fetchData();
    },

    /* 异步加载系统驱动器/磁盘列表（核心功能：获取可访问的磁盘分区并渲染到侧边栏）*/
    //   1. 非本地/Blob协议下，通过接口请求真实磁盘列表；
    //   2. 本地/Blob协议（如本地调试）或请求失败时，渲染默认的C盘作为演示；
    //   3. 渲染后的磁盘项支持点击跳转对应路径。;

  app.updatePagination = function updatePagination() {
        const { offset, count, total, items } = this.state;
        const currentPage = Math.floor(offset / count) + 1;
        const totalPages = Math.ceil(total / count) || 1;
        this.dom.pageInput.value = currentPage;
        this.dom.pageInput.max = totalPages;
        this.dom.totalPages.textContent = `/ ${totalPages} 页`;

        const currentCount = items.length;
        let statusText = `共 ${total} 个项目`;
        if (total > count) {
            statusText += ` (本页 ${currentCount} 个)`;
        }
        this.dom.statusLeft.textContent = statusText;
    };

  app.prevPage = function prevPage() { if (this.state.offset > 0) { this.state.offset -= this.state.count; this.fetchData(); } };

  app.nextPage = function nextPage() { if (this.state.offset + this.state.count < this.state.total) { this.state.offset += this.state.count; this.fetchData(); } };

  app.jumpToPage = function jumpToPage(page) {
        page = parseInt(page);
        const totalPages = Math.ceil(this.state.total / this.state.count);
        if (page === -1) page = totalPages;

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        this.state.offset = (page - 1) * this.state.count;
        this.fetchData();
    };

  app.sort = function sort(col) {
        if (this.state.sortCol === col) this.state.sortAsc = this.state.sortAsc ? 0 : 1;
        else { this.state.sortCol = col; this.state.sortAsc = 1; }
        this.fetchData();
    };

}
