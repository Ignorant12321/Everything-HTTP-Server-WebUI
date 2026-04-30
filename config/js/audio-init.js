// 音频初始化：绑定播放器事件、封面、歌词和可视化。
import { svg_disk, svg_favorite_filled, svg_favorite_outline, svg_play, svg_pause, svg_loop_none, svg_loop_single, svg_loop_list, svg_shuffle_list, svg_fullscreen, svg_close, svg_volume, svg_volume_mute } from './icons.js';
export function attachAudioInitMethods(app) {
  app.initAudioPlayer = async function initAudioPlayer(container, file) {
        const audio = container.querySelector('audio'), playBtn = document.getElementById(`playBtn-${file.uniqueId}`), progress = document.getElementById(`audioProgress-${file.uniqueId}`);
        const progressArea = document.getElementById(`audioProgressArea-${file.uniqueId}`), curTimeEl = document.getElementById(`curTime-${file.uniqueId}`), durTimeEl = document.getElementById(`durTime-${file.uniqueId}`);
        const lyricsBox = document.getElementById(`lyricsBox-${file.uniqueId}`), titleEl = document.getElementById(`audioTitle-${file.uniqueId}`), artistEl = document.getElementById(`audioArtist-${file.uniqueId}`);
        const coverImg = document.getElementById(`audioCover-${file.uniqueId}`), coverPh = document.getElementById(`audioPlaceholder-${file.uniqueId}`), loopBtn = document.getElementById(`loopBtn-${file.uniqueId}`);
        const volumePopupPanel = document.getElementById(`volumePopupPanel-${file.uniqueId}`), volumeRangeInput = document.getElementById(`volumeRangeInput-${file.uniqueId}`), volumeToggleBtn = document.getElementById(`volumeToggleBtn-${file.uniqueId}`);
        const volumePercentText = document.getElementById(`volumePercent-${file.uniqueId}`), bgLayer = document.getElementById(`audioBg-${file.uniqueId}`), playerContainer = document.getElementById(`audioContainer-${file.uniqueId}`);
        const canvas = document.getElementById(`visualizer-${file.uniqueId}`);
        this.updateLoopBtnUI(loopBtn);
        let lyricsData = [];
        let isDragging = false;
        let audioContext, analyser, dataArray, source;
        let animationId;
        const applyAdaptiveTheme = (img) => {
            const rgb = this.getAverageRGB(img);
            const { r, g, b } = rgb;
            const isLight = this.isLightColor(r, g, b);
            bgLayer.style.background = `linear-gradient(135deg, rgb(${r},${g},${b}), rgb(${r * 0.6},${g * 0.6},${b * 0.6}))`;
            const textColor = isLight ? '#202020' : '#ffffff';
            const subColor = isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
            playerContainer.style.color = textColor;
            titleEl.style.color = textColor;
            artistEl.style.color = subColor;
            curTimeEl.style.color = subColor;
            durTimeEl.style.color = subColor;
            lyricsBox.style.color = subColor;
            const btns = container.querySelectorAll('.icon-btn:not(.play-btn)');
            btns.forEach(btn => btn.style.color = textColor);
        };
        coverImg.onload = () => {
            applyAdaptiveTheme(coverImg);
        };
        const initVisualizer = () => {
            if (audioContext) return; // 避免重复初始化
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            source = audioContext.createMediaElementSource(audio);
            analyser = audioContext.createAnalyser();
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            analyser.fftSize = 256; // 决定条的数量 (值越大条越细)
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            const ctx = canvas.getContext('2d');
            const draw = () => {
                animationId = requestAnimationFrame(draw);
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                const width = canvas.width;
                const height = canvas.height;
                analyser.getByteFrequencyData(dataArray);
                ctx.clearRect(0, 0, width, height);
                const barWidth = (width / bufferLength) * 2.5;
                let barHeight;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    barHeight = dataArray[i] / 2; // 调整高度比例
                    const fillStyle = playerContainer.style.color === 'rgb(32, 32, 32)'
                        ? `rgba(0,0,0, ${barHeight / 200})`
                        : `rgba(255,255,255, ${barHeight / 200})`;
                    ctx.fillStyle = fillStyle;
                    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }
            };
            draw();
        };
        if (window.jsmediatags) {
            fetch(file.url).then(r => r.blob()).then(blob => {
                window.jsmediatags.read(blob, {
                    onSuccess: (tag) => {
                        const tags = tag.tags;
                        if (tags.title) titleEl.textContent = tags.title;
                        if (tags.artist) artistEl.textContent = tags.artist;
                        if (tags.picture) {
                            const { data, format } = tags.picture;
                            let base64String = "";
                            for (let i = 0; i < data.length; i++) base64String += String.fromCharCode(data[i]);
                            coverImg.src = `data:${format};base64,${window.btoa(base64String)}`;
                            coverImg.style.opacity = 1;
                            coverPh.style.display = 'none';
                        }
                    },
                    onError: (error) => { console.log('Tags read error', error); }
                });
            });
        }
        const lrcUrl = file.url.replace(/\.[^.]+$/, '.lrc');
        fetch(lrcUrl).then(r => { if (r.ok) return r.text(); throw new Error(); })
            .then(text => {
                lyricsData = this.parseLrc(text);
                this.renderLyrics(lyricsBox, lyricsData, file.uniqueId);
            }).catch(() => { lyricsBox.innerHTML = '<div style="margin-top:50%;">暂无歌词</div>'; });
        audio.volume = 1;
        let lastVolume = 1; // 用于静音恢复
        const updateVolumeUI = () => {
            const vol = audio.volume;
            volumeRangeInput.value = vol;
            if (volumePercentText) {
                volumePercentText.textContent = Math.round(vol * 100) + '%';
            }
            if (vol === 0) {
                volumeToggleBtn.innerHTML = svg_volume_mute;
                volumeToggleBtn.style.opacity = 0.5;
            } else {
                volumeToggleBtn.innerHTML = svg_volume;
                volumeToggleBtn.style.opacity = 0.8;
            }
        };
        volumeToggleBtn.onclick = (e) => {
            e.stopPropagation();
            if (audio.volume > 0) {
                lastVolume = audio.volume;
                audio.volume = 0;
            } else {
                audio.volume = lastVolume > 0 ? lastVolume : 1;
            }
            updateVolumeUI();
        };
        volumeRangeInput.oninput = (e) => {
            e.stopPropagation(); // 关键：防止拖动时触发外部点击事件
            audio.volume = parseFloat(e.target.value);
            updateVolumeUI();
        };
        volumePopupPanel.onclick = (e) => {
            e.stopPropagation();
        };
        updateVolumeUI();
        const closeVolPopup = () => {
            if (volumePopupPanel.classList.contains('show')) {
                volumePopupPanel.classList.remove('show');
            }
        };
        playerContainer.addEventListener('click', closeVolPopup);
        const updateVolIcon = () => {
            if (audio.volume === 0) {
                volumeToggleBtn.innerHTML = svg_volume_mute;
                volumeToggleBtn.style.opacity = 0.5;
            } else {
                volumeToggleBtn.innerHTML = svg_volume;
                volumeToggleBtn.style.opacity = 0.8;
            }
        };
        let lastVol = 1;
        volumeToggleBtn.onclick = () => {
            if (audio.volume > 0) {
                lastVol = audio.volume;
                audio.volume = 0;
                volumeRangeInput.value = 0;
            } else {
                audio.volume = lastVol > 0 ? lastVol : 0.5;
                volumeRangeInput.value = audio.volume;
            }
            updateVolIcon();
        };
        playBtn.onclick = () => {
            if (!audioContext) initVisualizer();
            if (audioContext && audioContext.state === 'suspended') audioContext.resume();
            if (audio.paused) {
                audio.play();
                playBtn.innerHTML = svg_pause;
                coverImg.classList.add('playing');
            } else {
                audio.pause();
                playBtn.innerHTML = svg_play;
                coverImg.classList.remove('playing');
            }
        };
        audio.addEventListener('timeupdate', () => {
            if (!isDragging) {
                const percent = (audio.currentTime / audio.duration) * 100;
                progress.style.width = `${percent}%`;
                curTimeEl.textContent = this.formatTime(audio.currentTime);
            }
            if (lyricsData.length > 0) this.syncLyrics(lyricsBox, lyricsData, audio.currentTime, file.uniqueId);
        });
        audio.addEventListener('loadedmetadata', () => {
            durTimeEl.textContent = this.formatTime(audio.duration);
            audio.play().catch(() => { }).then(() => {
                if (!audioContext) initVisualizer();
            });
            playBtn.innerHTML = svg_pause;
            coverImg.classList.add('playing');
        });
        audio.addEventListener('ended', () => {
            if (this.state.loopMode === 'one') {
                audio.currentTime = 0;
                audio.play();
            }
            else if (this.state.loopMode === 'list' || this.state.loopMode === 'shuffle') {
                this.playNextInFavorites(file, this.state.loopMode === 'shuffle');
            }
            else {
                playBtn.innerHTML = svg_play;
                coverImg.classList.remove('playing');
                progress.style.width = '0%';
            }
        });
        const handleDrag = (clientX) => {
            const rect = progressArea.getBoundingClientRect();
            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            progress.style.width = `${percent * 100}%`;
            const dragTime = percent * audio.duration;
            curTimeEl.textContent = this.formatTime(dragTime);
            return dragTime;
        };
        const startDrag = (clientX) => { isDragging = true; handleDrag(clientX); };
        const doDrag = (clientX) => { if (isDragging) handleDrag(clientX); };
        const endDrag = (clientX) => {
            if (isDragging) {
                audio.currentTime = handleDrag(clientX);
                isDragging = false;
            }
        };
        progressArea.addEventListener('mousedown', (e) => {
            startDrag(e.clientX);
            const onMove = (ev) => doDrag(ev.clientX);
            const onUp = (ev) => { endDrag(ev.clientX); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });
        progressArea.addEventListener('touchstart', (e) => {
            startDrag(e.touches[0].clientX);
            const onMove = (ev) => { ev.preventDefault(); doDrag(ev.touches[0].clientX); };
            const onUp = (ev) => { endDrag(ev.changedTouches[0].clientX); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp); };
            document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onUp);
        }, { passive: false });
        const makeDraggable = (el) => {
            let isDraggingPlayer = false;
            let startX, startY, initialLeft, initialTop;
            const onMouseDown = (e) => {
                const noDragSelector = [
                    'button',
                    '.audio-progress-container',
                    '.audio-section-lyrics',
                    '.cc-btn',
                    '.icon-btn',
                    '.volume-wrapper',
                    '.audio-section-info img',
                    '.audio-meta'
                ].join(','); // 将数组合并成 "button, .class1, .class2..." 的字符串
                if (e.target.closest(noDragSelector)) {
                    el.style.cursor = 'default';
                    return;
                }
                if (e.button !== 0) return;
                if (this.state.isPinned) return;//钉住状态
                isDraggingPlayer = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = el.getBoundingClientRect();
                const parentRect = el.parentElement.getBoundingClientRect();
                initialLeft = rect.left - parentRect.left;
                initialTop = rect.top - parentRect.top;
                el.style.transform = 'none';
                el.style.left = `${initialLeft}px`;
                el.style.top = `${initialTop}px`;
                el.style.cursor = 'grabbing';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            const onMouseMove = (e) => {
                if (!isDraggingPlayer) return;
                e.preventDefault(); // 防止选中文字
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                el.style.left = `${initialLeft + dx}px`;
                el.style.top = `${initialTop + dy}px`;
            };
            const onMouseUp = () => {
                isDraggingPlayer = false;
                el.style.cursor = 'move';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            if (window.innerWidth > 768) {
                el.addEventListener('mousedown', onMouseDown);
            }
        };
        makeDraggable(playerContainer);
        file._audioContext = {
            audio,
            ctx: audioContext, // Web Audio Context
            close: () => {
                if (animationId) cancelAnimationFrame(animationId);
                if (audioContext) audioContext.close();
            }
        };
  };
}
