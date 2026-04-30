// 音频播放器模块：生成播放器、切歌、循环和固定窗口。

function attachAudioMethods(app) {

  app.buildAudioPlayerHTML = function buildAudioPlayerHTML(file) {
        const volumeHtml = `
            <div class="volume-wrapper" id="volumeControlArea-${file.uniqueId}">
                <div class="volume-popup" id="volumePopupPanel-${file.uniqueId}">
                    <div class="volume-text-display" id="volumePercent-${file.uniqueId}" style="text-align:center; color:white; font-size:12px; margin-bottom:6px;">100%</div>
                    
                    <input type="range" class="volume-slider-vertical" id="volumeRangeInput-${file.uniqueId}" 
                        min="0" max="1" step="0.01" value="1">
                </div>
                <button class="icon-btn" id="volumeToggleBtn-${file.uniqueId}" title="音量" style="color:inherit;opacity:0.8">
                    ${svg_volume}
                </button>
            </div>
        `;
        return `
        <div class="audio-player-container" id="audioContainer-${file.uniqueId}">
            <div class="audio-bg-layer" id="audioBg-${file.uniqueId}"></div>
            <canvas class="audio-visualizer" id="visualizer-${file.uniqueId}"></canvas>

            <div class="audio-section-info">
                <img src="" id="audioCover-${file.uniqueId}" class="audio-cover-img" style="opacity:0" crossorigin="anonymous">
                <div id="audioPlaceholder-${file.uniqueId}" class="audio-cover-placeholder">🎵</div>
                <div class="audio-meta">
                    <div class="audio-title" id="audioTitle-${file.uniqueId}">${file.name}</div>
                    <div class="audio-artist" id="audioArtist-${file.uniqueId}">Unknown Artist</div>
                </div>
            </div>

            <div class="audio-section-lyrics" id="lyricsBox-${file.uniqueId}">
                <div style="margin-top:50%;">正在搜索歌词...</div>
            </div>

            <div class="audio-section-controls">
                <div class="audio-progress-row">
                    <span class="audio-time" id="curTime-${file.uniqueId}">00:00</span>
                    <div class="audio-progress-container" id="audioProgressArea-${file.uniqueId}">
                        <div class="audio-progress-bar" id="audioProgress-${file.uniqueId}"></div>
                    </div>
                    <span class="audio-time" id="durTime-${file.uniqueId}">00:00</span>
                </div>

                <div class="audio-btn-row">
                    <button class="icon-btn" onclick="app.toggleFullScreen('${file.uniqueId}')" id="fsBtn-${file.uniqueId}" title="全屏" style="color:inherit;opacity:0.8">${svg_fullscreen}</button>
                    <button class="icon-btn" onclick="app.toggleLoop('${file.uniqueId}')" id="loopBtn-${file.uniqueId}" title="切换循环模式" style="color:inherit;opacity:0.8">${svg_loop_single}</button>
                    <button class="icon-btn play-btn" id="playBtn-${file.uniqueId}">${svg_play}</button>
                    
                    ${volumeHtml} <button class="icon-btn" onclick="app.togglePin('${file.uniqueId}')" id="pinBtn-${file.uniqueId}" title="固定并穿透" style="color:inherit;opacity:0.8;width:30px;">
                    <svg width="18" height="18" fill="currentColor"><use href="#icon-pin-off"></use></svg>
                    </button>
                </div>
            </div>
        </div>
        <audio id="audioEl-${file.uniqueId}" src="${file.url}" crossorigin="anonymous" style="display:none"></audio>
        `;
  };

  app.playNextInFavorites = function playNextInFavorites(currentFile, isShuffle) {
        const allFavs = this.state.favorites;
        if (!allFavs || allFavs.length === 0) return;

        const audioFavs = allFavs.filter(f => {
            if (f.isFolder) return false;
            const ext = f.url.split('.').pop().toLowerCase();
            return this.getFileType(ext) === 'audio';
        });

        if (audioFavs.length === 0) return;

        const currentIndex = audioFavs.findIndex(f => f.url === currentFile.url);

        let nextIndex = 0;

        if (isShuffle) {
            if (audioFavs.length > 1) {
                do {
                    nextIndex = Math.floor(Math.random() * audioFavs.length);
                } while (nextIndex === currentIndex);
            }
        } else {
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % audioFavs.length;
            }
        }

        const nextFav = audioFavs[nextIndex];

        const nextItem = {
            name: nextFav.name,
            fakeUrl: nextFav.url,
        };

        this.showToast(isShuffle ? `随机播放: ${nextItem.name}` : `播放下一首: ${nextItem.name}`);

        this.handleOpenAction(nextItem);
    };

  app.toggleLoop = function toggleLoop(uid) {
        const btn = document.getElementById(`loopBtn-${uid}`);

        if (this.state.loopMode === 'none') {
            this.state.loopMode = 'list';
            this.showToast("模式: 收藏列表循环");
        } else if (this.state.loopMode === 'list') {
            this.state.loopMode = 'shuffle';
            this.showToast("模式: 收藏列表随机");
        } else if (this.state.loopMode === 'shuffle') {
            this.state.loopMode = 'one';
            this.showToast("模式: 单曲循环");
        } else {
            this.state.loopMode = 'none';
            this.showToast("模式: 不循环");
        }
        this.updateLoopBtnUI(btn);
    };

  app.togglePin = function togglePin(uid) {
        const container = document.getElementById(`audioContainer-${uid}`);
        const btn = document.getElementById(`pinBtn-${uid}`);
        if (!container || !btn) return;

        const isPinned = container.classList.toggle('pinned');
        this.state.isPinned = !this.state.isPinned;

        if (isPinned) {
            btn.innerHTML = `<svg width="18" height="18" fill="currentColor"><use href="#icon-pin-on"></use></svg>`;
            btn.title = "解锁窗口 (允许拖动)";
            btn.style.opacity = "1";
            btn.style.color = "var(--accent-color)"; // 高亮显示
            this.showToast("窗口已固定，背景可穿透");
        } else {
            btn.innerHTML = `<svg width="18" height="18" fill="currentColor"><use href="#icon-pin-off"></use></svg>`;
            btn.title = "固定窗口 (鼠标穿透)";
            btn.style.opacity = "0.8";
            btn.style.color = "inherit";
            this.showToast("窗口已解锁");
        }
    };

  app.updateLoopBtnUI = function updateLoopBtnUI(btn) {
        if (!btn) return;
        if (this.state.loopMode === 'one') {
            btn.innerHTML = svg_loop_single;
            btn.title = "单曲循环";
        } else if (this.state.loopMode === 'list') {
            btn.innerHTML = svg_loop_list; // 列表循环图标
            btn.title = "收藏列表循环";
        } else if (this.state.loopMode === 'shuffle') {
            btn.innerHTML = svg_shuffle_list; // 随机图标
            btn.title = "收藏列表随机";
        } else {
            btn.innerHTML = svg_loop_none; // 不循环图标
            btn.title = "不循环";
        }
    };

}
