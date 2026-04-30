// 字幕模块：加载本地字幕、查找相邻字幕并转换 SRT。

function attachSubtitleMethods(app) {

  app.initSubtitleHandler = function initSubtitleHandler() {
        this.dom.subtitleInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleSubtitleFile(file);
            }
            e.target.value = '';
        });
  };

  app.triggerSubtitleLoad = function triggerSubtitleLoad() {
        this.dom.subtitleInput.click();
    };

  app.handleSubtitleFile = function handleSubtitleFile(file) {
        if (this.state.activeFileIndex === -1) return;
        const currentViewerFile = this.state.openFiles[this.state.activeFileIndex];

        const name = file.name.toLowerCase();
        const type = name.endsWith('.srt') ? 'srt' : 'vtt';
        const objectUrl = URL.createObjectURL(file);

        const fakeSelect = {
            value: objectUrl,
            options: [{ dataset: { type: type }, selectedIndex: 0 }],
            selectedIndex: 0
        };

        this.changeSubtitle({ value: objectUrl, dataset: { type: type } }, currentViewerFile.uniqueId, true);
        this.showToast(`已加载字幕: ${file.name}`);
  };

  app.findAndLoadSubtitles = async function findAndLoadSubtitles(file, container) {
        if (!file || !file.url) return;

        const lastDotIndex = file.url.lastIndexOf('.');
        if (lastDotIndex === -1) return;
        const baseUrl = file.url.substring(0, lastDotIndex);

        const candidates = [
            { label: '默认 (.vtt)', url: `${baseUrl}.vtt`, type: 'vtt' },
            { label: '默认 (.srt)', url: `${baseUrl}.srt`, type: 'srt' },
            { label: '中文 (.zh.vtt)', url: `${baseUrl}.zh.vtt`, type: 'vtt' },
            { label: '中文 (.zh.srt)', url: `${baseUrl}.zh.srt`, type: 'srt' }
        ];

        for (let sub of candidates) {
            try {
                const res = await fetch(sub.url, { method: 'GET' });
                if (res.ok) {
                    console.log(`Auto-loaded subtitle: ${sub.url}`);
                    this.changeSubtitle({
                        value: sub.url,
                        dataset: { type: sub.type }
                    }, file.uniqueId);
                    break;
                }
            } catch (e) {
            }
        }
  };

  app.changeSubtitle = async function changeSubtitle(sourceObj, uid) {
        const videoEl = document.getElementById(`video-${uid}`);
        if (!videoEl) return;

        const url = sourceObj.value;
        if (!url) return;

        const oldTrack = videoEl.querySelector('track');
        if (oldTrack) {
            if (oldTrack.src.startsWith('blob:')) {
                URL.revokeObjectURL(oldTrack.src); // 释放旧的 Blob 内存
            }
            oldTrack.remove();
        }
        Array.from(videoEl.querySelectorAll('track')).forEach(t => t.remove());

        const type = sourceObj.dataset.type;
        let finalUrl = url;

        try {
            if (type === 'srt') {
                console.log("Converting SRT to VTT...");
                const res = await fetch(url);
                const srtText = await res.text();

                const vttText = this.srt2webvtt(srtText);

                const blob = new Blob([vttText], { type: 'text/vtt' });
                finalUrl = URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error('Subtitle conversion failed:', e);
            return;
        }

        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = '';
        track.srclang = 'zh';
        track.src = finalUrl;
        track.default = true;

        videoEl.appendChild(track);

        setTimeout(() => {
            if (videoEl.textTracks && videoEl.textTracks.length > 0) {
                const t = videoEl.textTracks[videoEl.textTracks.length - 1];
                t.mode = 'showing'; // 强制显示
            }
        }, 100);
  };

  app.srt2webvtt = function srt2webvtt(data) {
        let srt = data.replace(/\r\n|\r/g, '\n');

        srt = srt.trim();

        const vttBody = srt.replace(
            /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
            '$1.$2'
        );

        return "WEBVTT\n\n" + vttBody;
  };

}
