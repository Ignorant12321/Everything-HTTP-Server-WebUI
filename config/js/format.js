// 格式化模块：统一处理大小、日期和时间文本。

function attachFormatMethods(app) {

  app.formatSize = function formatSize(bytes) {
        if (bytes === undefined) return '';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

  app.parseDate = function parseDate(ts) {
        if (!ts) return '-';
        let d;
        let numTs = ts;
        if (typeof ts === 'string') {
            if (ts.includes('T')) {
                d = new Date(ts);
                if (!isNaN(d.getTime())) return this.formatDateObj(d);
            }
            if (/^\d+$/.test(ts)) {
                numTs = parseInt(ts, 10);
            }
        }
        if (typeof numTs === 'number') {
            if (numTs > 10000000000000000) {
                d = new Date((numTs / 10000) - 11644473600000);
            }
            else if (numTs > 1000000000000) {
                d = new Date(numTs);
            }
            else if (numTs > 0) {
                d = new Date(numTs * 1000);
            }
        }
        if (!d || isNaN(d.getTime()) || d.getFullYear() < 1970) return '-';
        return this.formatDateObj(d);
    };

  app.formatDateObj = function formatDateObj(d) {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

}
