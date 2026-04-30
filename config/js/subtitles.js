// 字幕模块：加载本地字幕、查找相邻字幕并转换 SRT。



export function attachSubtitleMethods(app) {

  app.initSubtitleHandler = function initSubtitleHandler() {
        // 绑定文件选择变化事件
        this.dom.subtitleInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleSubtitleFile(file);
            }
            // 重置 input 允许重复选择同一文件
            e.target.value = '';
        });
    },
    // --- 新增：清除文字动画 ---;

  app.triggerSubtitleLoad = function triggerSubtitleLoad() {
        this.dom.subtitleInput.click();
    };

  app.handleSubtitleFile = function handleSubtitleFile(file) {
        if (this.state.activeFileIndex === -1) return;
        const currentViewerFile = this.state.openFiles[this.state.activeFileIndex];

        // 简单判断后缀
        const name = file.name.toLowerCase();
        const type = name.endsWith('.srt') ? 'srt' : 'vtt';
        const objectUrl = URL.createObjectURL(file);

        // 调用加载逻辑
        // 构造一个模拟的 select option 结构或直接调用加载
        const fakeSelect = {
            value: objectUrl,
            options: [{ dataset: { type: type }, selectedIndex: 0 }],
            selectedIndex: 0
        };

        // 直接复用 logic
        this.changeSubtitle({ value: objectUrl, dataset: { type: type } }, currentViewerFile.uniqueId, true);
        this.showToast(`已加载字幕: ${file.name}`);
    },

    // --- 侧边栏/详情页拖拽逻辑 ---;

  app.findAndLoadSubtitles = async function findAndLoadSubtitles(file, container) {
        if (!file || !file.url) return;

        // 获取基础路径
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
                // 使用 GET 请求，避免部分服务器不支持 HEAD 导致的 400/405 错误
                const res = await fetch(sub.url, { method: 'GET' });
                if (res.ok) {
                    console.log(`Auto-loaded subtitle: ${sub.url}`);
                    // 找到后直接加载
                    this.changeSubtitle({
                        value: sub.url,
                        dataset: { type: sub.type }
                    }, file.uniqueId);
                    break;
                }
            } catch (e) {
                // 忽略网络错误，继续尝试下一个
            }
        }
    },

    // --- 核心修改：合并逻辑并处理内存 ---;

  app.changeSubtitle = async function changeSubtitle(sourceObj, uid) {
        const videoEl = document.getElementById(`video-${uid}`);
        if (!videoEl) return;

        const url = sourceObj.value;
        if (!url) return;

        // 1. 清理旧轨道和内存
        // 这一点很重要：防止之前生成的 Blob URL 堆积导致内存泄漏
        const oldTrack = videoEl.querySelector('track');
        if (oldTrack) {
            if (oldTrack.src.startsWith('blob:')) {
                URL.revokeObjectURL(oldTrack.src); // 释放旧的 Blob 内存
            }
            oldTrack.remove();
        }
        // 额外清理：确保 textTracks 列表也干净
        Array.from(videoEl.querySelectorAll('track')).forEach(t => t.remove());

        const type = sourceObj.dataset.type;
        let finalUrl = url;

        try {
            // 2. 如果是 SRT (无论本地还是远程)，都需要转换
            if (type === 'srt') {
                console.log("Converting SRT to VTT...");
                // fetch 支持 http:// 也支持 blob: (本地文件)，所以不需要区分 isLocal
                const res = await fetch(url);
                const srtText = await res.text();

                // 转换核心
                const vttText = this.srt2webvtt(srtText);

                // 生成 Blob
                const blob = new Blob([vttText], { type: 'text/vtt' });
                finalUrl = URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error('Subtitle conversion failed:', e);
            return;
        }

        // 3. 创建并挂载新轨道
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = '';
        track.srclang = 'zh';
        track.src = finalUrl;
        track.default = true;

        videoEl.appendChild(track);

        // 4. 激活显示 (兼容性处理)
        // 某些移动端浏览器需要一点点延迟来识别新加入的 track
        setTimeout(() => {
            if (videoEl.textTracks && videoEl.textTracks.length > 0) {
                const t = videoEl.textTracks[videoEl.textTracks.length - 1];
                t.mode = 'showing'; // 强制显示
            }
        }, 100);
    },

    // --- 增强版转换器 ---;

  app.srt2webvtt = function srt2webvtt(data) {
        // 1. 统一换行符 (防止 Windows \r\n 造成干扰)
        let srt = data.replace(/\r\n|\r/g, '\n');

        // 2. 移除空行或修剪首尾
        srt = srt.trim();

        // 3. 核心替换：将逗号时间戳 (00:00:00,000) 改为点 (00:00:00.000)
        // 这是一个非常经典的 SRT->VTT 正则
        const vttBody = srt.replace(
            /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
            '$1.$2'
        );

        // 4. 拼接头部
        return "WEBVTT\n\n" + vttBody;
    },

    // --- 音频播放器核心逻辑 ---;

}
