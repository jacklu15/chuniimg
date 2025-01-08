// https://zenn.dev/de_teiu_tkg/articles/0938b41ec85d20
const toBlob = (base64) => {
    const decodedData = atob(base64.replace(/^.*,/, ""));
    const buffers = new Uint8Array(decodedData.length);
    for (let i = 0; i < decodedData.length; i++) {
        buffers[i] = decodedData.charCodeAt(i);
    }
    try {
        const blob = new Blob([buffers.buffer], {
            type: "image/jpeg",
        });
        return blob;
    } catch (e) {
        return null;
    }
};

// https://qiita.com/h53/items/05139982c6fd81212b08
function toISOStringWithTimezone(date) {
    const pad = function (str) {
        return ('0' + str).slice(-2);
    };
    const year = (date.getFullYear()).toString();
    const month = pad((date.getMonth() + 1).toString());
    const day = pad(date.getDate().toString());
    const hour = pad(date.getHours().toString());
    const min = pad(date.getMinutes().toString());
    const sec = pad(date.getSeconds().toString());
    const tz = -date.getTimezoneOffset();
    const sign = tz >= 0 ? '+' : '-';
    const tzHour = pad((tz / 60).toString());
    const tzMin = pad((tz % 60).toString());

    return `${year}-${month}-${day}T${hour}:${min}:${sec}${sign}${tzHour}:${tzMin}`;
}

// updated_atから日付のみを取得
function getUpdatedDate(updated_at) {
    return new Date(updated_at.slice(0, 10));
}

function floorFloatBig(f, n) {
    let p = Big(10).pow(n);
    return f.times(p).round(0, 0).div(p);
}

// Rating計算
function calculateRating(score, chartConstant, floor=true) {
    let rating = Big(0);
    chartConstant = Big(chartConstant);
    if (score >= 1009000) {
        rating = chartConstant.plus(2.15);
    } else if (score >= 1007500) {
        rating = chartConstant.plus(2).plus((score - 1007500) / 100 * 0.01);
    } else if (score >= 1005000) {
        rating = chartConstant.plus(1.5).plus((score - 1005000) / 500 * 0.1);
    } else if (score >= 1000000) {
        rating = chartConstant.plus(1).plus((score - 1000000) / 1000 * 0.1);
    } else if (score >= 975000) {
        rating = chartConstant.plus((score - 975000) / 2500 * 0.1);
    } else if (score >= 900000) {
        rating = chartConstant.minus(5).plus((score - 900000) / 1500 * 0.1);
    } else if (score >= 800000) {
        rating = chartConstant.minus(5).div(2).plus((score - 800000) * (chartConstant - 5) / 200000);
    } else if (score >= 500000) {
        rating = chartConstant.minus(5).div(2).times((score - 500000) / 300000);
    }

    rating = floor ? floorFloatBig(rating, 2) : rating;
    return Math.max(rating.toNumber(), 0);
}

function loadingState(b) {
    if (b) {
        // ローダー表示
        document.getElementById("imggen_loader").style.display = "block";

        // 生成ボタン非表示
        document.getElementById("generate").style.display = "none";
    } else {
        // ローダー非表示
        document.getElementById("imggen_loader").style.display = "none";

        // 生成ボタン表示
        document.getElementById("generate").style.display = "block";
    }
}

function initializeArea() {
    const bestSongs = document.getElementById("img-best-songs");
    while (bestSongs.firstChild) bestSongs.removeChild(bestSongs.firstChild);
    const newSongs = document.getElementById("img-new-songs");
    while (newSongs.firstChild) newSongs.removeChild(newSongs.firstChild);
    const imgWrapper = document.getElementById("result-img-wrapper");
    while (imgWrapper.firstChild) imgWrapper.removeChild(imgWrapper.firstChild);
}

function removeButtons() {
    document.getElementById("generate-image").style.display = "none";
    document.getElementById("download").style.display = "none";
    document.getElementById("share").style.display = "none";
}

function renderImage() {
    loadingState(true);
    removeButtons();
    html2canvas(document.getElementById("pre-render-area"), { scale: 2 }).then(c => {
        document.getElementById("pre-render-area").style.display = "none";
        const img = document.createElement("img");
        img.src = c.toDataURL("image/jpeg");
        img.id = "result-img";
        img.style.width = "min(100%, 900px)";
        document.getElementById("result-img-wrapper").appendChild(img);
        document.getElementById("result-img-wrapper").style.display = "block";
        document.getElementById("download").style.display = "block";
        document.getElementById("share").style.display = "block";
        loadingState(false);
    });
    loadingState(false);
}

// --------------------------------------------------

const allMusicsRecordURL = "https://reiwa.f5.si/chunithm_record.json";
const additionalMusicsURL = "https://reiwa.f5.si/chunirec_additional_record.json?rev=1";
const versions_URL = "https://reiwa.f5.si/chunithm_versions.json";
var allMusics, additionalMusics, versions;

document.addEventListener("DOMContentLoaded", async function () {
    allMusics = await (await fetch(allMusicsRecordURL)).json();
    additionalMusics = await (await fetch(additionalMusicsURL)).json();
    allMusics = allMusics.concat(additionalMusics);
    versions = await (await fetch(versions_URL)).json();
});

function complementRecord(entries) {
    for (let i = 0; i < entries.length; i++) {
        let entry = entries[i];
        let music = allMusics.find(m => (m.chunirec_id === entry.id && m.diff === entry.diff));
        if (music) {
            entry.version = music.version;
            entry.artist = music.artist;
            // entry.release = music.release * 100;
            entry.ratingDetailed = calculateRating(entry.score, entry.const, false);
        } else {
            console.log(`Music not found: ${entry.title} ${entry.diff}`);
        }
    }

    return entries;
}

// const NEWEST_VERSION = "CHUNITHM VERSE";
const NEWEST_VERSION = "VERSE";

// QUESTIONABLE: バージョン名書くだけで良い気もするが将来のことを考えるときちっとrelease時間比較したほうが良い気がする
function calculateBest(entries, count) {
    return entries.filter(e => e.version !== NEWEST_VERSION).slice(0, count);
}

function calculateNew(entries, count) {
    return entries.filter(e => e.version === NEWEST_VERSION).slice(0, count);
}

function calclateAverageRating(entries, count) {
    return entries.reduce((acc, cur) => acc + cur.rating, 0) / count;
}