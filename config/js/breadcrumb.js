// 地址栏面包屑：Win11 资源管理器风格的分段路径、编辑模式与子目录下拉。

function attachBreadcrumbMethods(app) {
  const CRUMB_CHEVRON = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  app.buildBreadcrumbSegments = function buildBreadcrumbSegments(path) {
    const rootSegment = { label: '此电脑', path: 'root:', root: true };
    if (!path || path === 'root:') return [rootSegment];

    const segments = [rootSegment];
    const driveMatch = path.match(/^([a-zA-Z]:)\\?/);
    if (driveMatch) {
      const drivePath = driveMatch[1] + '\\';
      segments.push({ label: driveMatch[1], path: drivePath, drive: true });
      let acc = drivePath;
      path.slice(driveMatch[0].length).split('\\').filter(Boolean).forEach((part) => {
        acc = acc.endsWith('\\') ? acc + part : acc + '\\' + part;
        segments.push({ label: part, path: acc });
      });
      return segments;
    }

    if (path.startsWith('\\\\')) {
      const parts = path.split('\\').filter(Boolean);
      let acc = '\\\\' + (parts[0] || '');
      segments.push({ label: parts[0] || path, path: acc });
      for (let i = 1; i < parts.length; i++) {
        acc += '\\' + parts[i];
        segments.push({ label: parts[i], path: acc });
      }
      return segments;
    }

    segments.push({ label: path, path: path });
    return segments;
  };

  function crumbButtonHtml(segment, isCurrent) {
    const icon = segment.root
      ? '<svg class="crumb-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-pc"></use></svg>'
      : '';
    const currentAttr = isCurrent ? ' aria-current="page"' : '';
    const title = segment.path || '此电脑';
    return `<button type="button" class="crumb-btn" data-path="${escapeHtml(segment.path)}" title="${escapeHtml(title)}"${currentAttr}>${icon}<span class="crumb-label">${escapeHtml(segment.label)}</span></button>`;
  }

  function sepHtml(segment) {
    return `<button type="button" class="crumb-sep" data-path="${escapeHtml(segment.path)}" title="选择子文件夹" aria-label="选择 ${escapeHtml(segment.label)} 的子文件夹">${CRUMB_CHEVRON}</button>`;
  }

  app.paintBreadcrumb = function paintBreadcrumb() {
    const nav = this.dom.breadcrumb;
    const segments = this._crumbSegs;
    if (!nav || !segments || !segments.length) return;

    const build = (start) => {
      let html = '';
      if (start > 0) {
        html += '<button type="button" class="crumb-btn crumb-ellipsis" title="展开完整路径" aria-label="展开完整路径">…</button>';
        html += sepHtml(segments[start - 1]);
      }
      for (let i = start; i < segments.length; i++) {
        if (i > start) html += sepHtml(segments[i - 1]);
        html += crumbButtonHtml(segments[i], i === segments.length - 1);
      }
      html += sepHtml(segments[segments.length - 1]);
      nav.innerHTML = html;
    };

    if (this._crumbUserExpanded) {
      build(0);
      nav.scrollLeft = nav.scrollWidth;
      return;
    }

    if (!nav.clientWidth) {
      build(0);
      return;
    }

    let start = 0;
    build(0);
    const maxStart = Math.max(0, segments.length - 2);
    while (start < maxStart && nav.scrollWidth > nav.clientWidth + 1) {
      start++;
      build(start);
    }
    this._crumbCollapsedCount = start;
    nav.scrollLeft = 0;
  };

  app.renderBreadcrumb = function renderBreadcrumb(path) {
    this._crumbSegs = this.buildBreadcrumbSegments(path);
    this._crumbUserExpanded = false;
    this.paintBreadcrumb();
  };

  app.setAddressMode = function setAddressMode(mode) {
    const container = this.dom.addressContainer;
    if (!container) return;
    const editing = mode === 'edit';
    container.classList.toggle('mode-edit', editing);
    container.classList.toggle('mode-breadcrumb', !editing);
  };

  app.enterAddressEdit = function enterAddressEdit() {
    this.closeCrumbDropdown();
    const container = this.dom.addressContainer;
    if (!container) return;
    if (!container.classList.contains('mode-edit')) {
      this.setAddressMode('edit');
      this.dom.address.value = this.state.currentPath === 'root:' ? '' : this.state.currentPath;
    }
    this.dom.address.focus();
  };

  app.exitAddressEdit = function exitAddressEdit() {
    const container = this.dom.addressContainer;
    if (!container || !container.classList.contains('mode-edit')) return;
    if (this.cancelAddressFx) this.cancelAddressFx();
    this.dom.address.value = this.state.currentPath;
    this.setAddressMode('breadcrumb');
    this.paintBreadcrumb();
  };

  app.closeCrumbDropdown = function closeCrumbDropdown() {
    clearTimeout(this._crumbDropTimer);
    this._crumbDropToken = null;
    if (this._crumbFlyoutSep) this._crumbFlyoutSep.classList.remove('is-open');
    if (this._crumbFlyout) {
      this._crumbFlyout.remove();
      this._crumbFlyout = null;
    }
    this._crumbFlyoutSep = null;
  };

  function positionFlyout(flyout, anchor) {
    const rect = anchor.getBoundingClientRect();
    flyout.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 240))}px`;
    flyout.style.top = `${rect.bottom + 4}px`;
  }

  app.openCrumbDropdown = async function openCrumbDropdown(sep, folderPath) {
    if (this._crumbFlyout && this._crumbFlyoutSep === sep) {
      this.closeCrumbDropdown();
      return;
    }
    this.closeCrumbDropdown();

    const flyout = document.createElement('div');
    flyout.className = 'flyout-menu crumb-dropdown show';
    flyout.innerHTML = '<div class="menu-item"><span class="menu-label">加载中...</span></div>';
    flyout.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item[data-path]');
      if (!item) return;
      this.closeCrumbDropdown();
      this.navigateTo(item.dataset.path, true);
    });
    document.body.appendChild(flyout);
    positionFlyout(flyout, sep);
    sep.classList.add('is-open');
    this._crumbFlyout = flyout;
    this._crumbFlyoutSep = sep;

    const token = {};
    this._crumbDropToken = token;

    let folders = [];
    try {
      if (!folderPath) {
        const res = await fetch('/?search=root:&json=1&count=100');
        const data = await res.json();
        folders = (data.results || []).map((d) => {
          const path = d.name.endsWith(':') ? d.name + '\\' : d.name;
          return { name: d.name, path: path, isFolder: true };
        });
      } else {
        const items = await this.fetchFolderChildren(folderPath);
        folders = items.filter((item) => this.isFolderItem(item)).map((item) => ({
          name: item.name,
          path: this.getItemFullPath(item),
          isFolder: true
        }));
      }
    } catch (e) {
      if (this._crumbDropToken !== token) return;
      flyout.innerHTML = '<div class="menu-item"><span class="menu-label">加载失败</span></div>';
      this._crumbDropTimer = setTimeout(() => this.closeCrumbDropdown(), 1200);
      return;
    }

    if (this._crumbDropToken !== token) return;

    if (!folders.length) {
      flyout.innerHTML = '<div class="menu-item"><span class="menu-label">暂无子文件夹</span></div>';
      this._crumbDropTimer = setTimeout(() => this.closeCrumbDropdown(), 900);
      return;
    }

    flyout.innerHTML = folders.map((folder) => (
      `<div class="menu-item" data-path="${escapeHtml(folder.path)}">` +
      `<span class="menu-icon"><svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><use href="#icon-nav-folder"></use></svg></span>` +
      `<span class="menu-label">${escapeHtml(folder.name)}</span>` +
      '</div>'
    )).join('');
    positionFlyout(flyout, sep);
  };

  app.initBreadcrumb = function initBreadcrumb() {
    const nav = this.dom.breadcrumb;
    const container = this.dom.addressContainer;
    if (!nav || !container) return;

    container.classList.add('mode-breadcrumb');

    nav.addEventListener('click', (e) => {
      const expand = e.target.closest('.crumb-ellipsis');
      if (expand) {
        this._crumbUserExpanded = true;
        this.paintBreadcrumb();
        return;
      }
      const sep = e.target.closest('.crumb-sep');
      if (sep) {
        e.stopPropagation();
        this.openCrumbDropdown(sep, sep.dataset.path === 'root:' ? '' : sep.dataset.path);
        return;
      }
      const crumb = e.target.closest('.crumb-btn');
      if (crumb) {
        this.closeCrumbDropdown();
        this.navigateTo(crumb.dataset.path, true);
        return;
      }
      this.enterAddressEdit();
    });

    if (this._crumbObserver) this._crumbObserver.disconnect();
    if (typeof ResizeObserver !== 'undefined') {
      this._crumbObserver = new ResizeObserver(() => {
        if (container.classList.contains('mode-breadcrumb')) this.paintBreadcrumb();
      });
      this._crumbObserver.observe(container);
    }

    document.addEventListener('click', (e) => {
      if (!this._crumbFlyout) return;
      if (e.target.closest('.crumb-dropdown') || e.target.closest('.crumb-sep')) return;
      this.closeCrumbDropdown();
    });
  };
}
