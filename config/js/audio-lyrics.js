// 歌词模块：解析 LRC、渲染歌词并同步播放进度。

function attachAudioLyricsMethods(app) {

  let lyricScrollRaf = 0;
  let lyricHlTimer = 0;

  app.parseLrc = function parseLrc(text) {
        const lines = text.split('\n');
        let result = [];
        const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

        for (let line of lines) {
            let matches;
            const content = line.replace(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g, '').trim();
            if (!content) continue;

            while ((matches = timeExp.exec(line)) !== null) {
                const min = parseInt(matches[1]);
                const sec = parseInt(matches[2]);
                const ms = parseInt(matches[3].padEnd(3, '0'));
                const time = min * 60 + sec + ms / 1000;
                result.push({ time, content });
            }
        }

        result.sort((a, b) => a.time - b.time);

        const merged = [];
        if (result.length > 0) {
            let current = result[0];
            for (let i = 1; i < result.length; i++) {
                if (Math.abs(result[i].time - current.time) < 0.2) {
                    current.content += '\n' + result[i].content; // 合并内容
                } else {
                    merged.push(current);
                    current = result[i];
                }
            }
            merged.push(current);
        }

        return merged;
    };

  app.renderLyrics = function renderLyrics(container, data, uid) {
        let html = '<div class="lyric-pad" style="height:50%"></div>';
        data.forEach((line, i) => {
            html += `<div class="lyric-line" id="lyric-${uid}-${i}" onclick="app.seekToLyric(${line.time}, '${uid}')">${line.content}</div>`;
        });
        html += '<div class="lyric-pad" style="height:50%"></div>';
        container.innerHTML = html;
        container.scrollTop = 0;
        if (lyricScrollRaf) cancelAnimationFrame(lyricScrollRaf);
        lyricScrollRaf = 0;
  };

  app.scrollLyricsToCenter = function scrollLyricsToCenter(container, line) {
        if (!container || !line) return;
        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const target = Math.max(0, line.offsetTop - container.clientHeight / 2 + line.offsetHeight / 2);
        if (reduced) {
            container.scrollTop = target;
            return;
        }
        if (lyricScrollRaf) cancelAnimationFrame(lyricScrollRaf);
        const start = container.scrollTop;
        const delta = target - start;
        if (Math.abs(delta) < 0.5) return;
        const duration = 480;
        const t0 = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const step = (now) => {
            const p = Math.min(1, (now - t0) / duration);
            container.scrollTop = start + delta * ease(p);
            if (p < 1) {
                lyricScrollRaf = requestAnimationFrame(step);
            } else {
                lyricScrollRaf = 0;
            }
        };
        lyricScrollRaf = requestAnimationFrame(step);
  };

  app.syncLyrics = function syncLyrics(container, data, time, uid) {
        let activeIndex = -1;
        for (let i = 0; i < data.length; i++) {
            if (time >= data[i].time) activeIndex = i;
            else break;
        }

        if (activeIndex === -1) return;

        const currentActive = container.querySelector('.lyric-line.active');
        const newActive = document.getElementById(`lyric-${uid}-${activeIndex}`);
        if (!newActive || currentActive === newActive) return;

        // 旧句先淡出，滚动立刻跟上，新句稍后再亮起
        if (currentActive) currentActive.classList.remove('active');
        app.scrollLyricsToCenter(container, newActive);

        const pendingId = newActive.id;
        clearTimeout(lyricHlTimer);
        lyricHlTimer = setTimeout(() => {
            const el = document.getElementById(pendingId);
            if (!el) return;
            container.querySelectorAll('.lyric-line.active').forEach((n) => n.classList.remove('active'));
            el.classList.add('active');
        }, 90);
    };

  app.seekToLyric = function seekToLyric(time, uid) {
        const audio = document.getElementById(`audioEl-${uid}`);
        if (audio) audio.currentTime = time;
    };

  app.formatTime = function formatTime(s) {
        if (!s || isNaN(s)) return '00:00';
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

}
