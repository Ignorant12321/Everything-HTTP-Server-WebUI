// 歌词模块：解析 LRC、渲染歌词并同步播放进度。

function attachAudioLyricsMethods(app) {

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
        let html = '<div style="height:50%"></div>'; // Padding top
        data.forEach((line, i) => {
            html += `<div class="lyric-line" id="lyric-${uid}-${i}" onclick="app.seekToLyric(${line.time}, '${uid}')">${line.content}</div>`;
        });
        html += '<div style="height:50%"></div>'; // Padding bottom
        container.innerHTML = html;
  };

  app.syncLyrics = function syncLyrics(container, data, time, uid) {
        let activeIndex = -1;
        for (let i = 0; i < data.length; i++) {
            if (time >= data[i].time) activeIndex = i;
            else break;
        }

        if (activeIndex !== -1) {
            const lines = container.querySelectorAll('.lyric-line');
            const currentActive = container.querySelector('.lyric-line.active');
            const newActive = document.getElementById(`lyric-${uid}-${activeIndex}`);

            if (currentActive !== newActive) {
                if (currentActive) currentActive.classList.remove('active');
                if (newActive) {
                    newActive.classList.add('active');
                    newActive.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
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
