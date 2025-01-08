const URLbase_record = "https://apiwrapper.qmc.workers.dev/?content=record&id=";
const URLbase_profile = "https://apiwrapper.qmc.workers.dev/?content=profile&id=";
const URLbase_jacket = "https://reiwa.f5.si/musicjackets/chunithm/";
const testProfile_URL = "https://reiwa.f5.si/testdata/chunirec_profile.json";
const testRecord_URL = "https://reiwa.f5.si/testdata/chunirec_record.json";

const BEST_COUNT = 30;
const NEW_COUNT = 20;

var testMode = false;

window.addEventListener("DOMContentLoaded", async function () {
    // ユーザー名をローカルストレージから取得
    document.getElementById("chunirec_username").value = localStorage.getItem("chunirec_username") || "";

    // アクセストークンをローカルストレージから取得
    // document.getElementById("chunirec_apiaccesstoken").value = localStorage.getItem("chunirec_apiaccesstoken") || "";

    // 設定読み込み
    document.getElementById("chunibestimgnew_showprev").checked = localStorage.getItem("chunibestimgnew_showprev") === "true";
    document.getElementById("chunibestimgnew_shownew").checked = localStorage.getItem("chunibestimgnew_shownew") === "true";
    // document.getElementById("chunibestimgnew_copyrightmode").checked = localStorage.getItem("chunibestimgnew_copyrightmode") === "true";

    // 不足データ読み込み
    // document.querySelector("#fix_theatorecreatore").value = localStorage.getItem("fix_theatorecreatore") || "";
    // document.querySelector("#fix_theatorecreatore_aj").checked = localStorage.getItem("fix_theatorecreatore_aj") === "true";
    // document.querySelector("#fix_theatorecreatore_fc").checked = localStorage.getItem("fix_theatorecreatore_fc") === "true";
});

async function generate() {
    loadingState(true);

    // ユーザープロフィール取得
    const username = document.getElementById("chunirec_username").value;
    // const userProfile = await (await fetch(URLbase_profile + username)).json();
    const userProfile = testMode ? await (await fetch(testProfile_URL)).json() : await (await fetch("https://apiwrapper.qmc.workers.dev/?content=profile&id=" + username)).json();

    if (userProfile.error !== undefined) {
        const errCode = userProfile.error.code;
        const errStr = "エラーコード: " + String(errCode) + "\n";
        switch (errCode) {
            case 404:
                alert(errStr + "ユーザーが見つかりませんでした。");
                break;
            case 403:
                alert(errStr + "非公開アカウントのユーザーです。");
                break;
            case 429:
                alert(errStr + "アクセスが集中しています。しばらく待ってから再度お試しください。");
                break;
            case 503:
                alert(errStr + "chunirecにアクセスできません。");
                break;
            default:
                alert(errStr + "不明なエラーです。問い合わせフォームまたはXアカウントからお問い合わせください。");
                break;
        }
        loadingState(false);
        return;
    }

    // ユーザー名を保存
    localStorage.setItem("chunirec_username", username);

    // 設定保存
    localStorage.setItem("chunibestimgnew_showprev", document.getElementById("chunibestimgnew_showprev").checked);
    localStorage.setItem("chunibestimgnew_shownew", document.getElementById("chunibestimgnew_shownew").checked);
    // localStorage.setItem("chunibestimgnew_copyrightmode", document.getElementById("chunibestimgnew_copyrightmode").checked);

    // 不足データ保存
    // localStorage.setItem("fix_theatorecreatore", document.querySelector("#fix_theatorecreatore").value);
    // localStorage.setItem("fix_theatorecreatore_aj", document.querySelector("#fix_theatorecreatore_aj").checked);
    // localStorage.setItem("fix_theatorecreatore_fc", document.querySelector("#fix_theatorecreatore_fc").checked);

    // レコードデータ取得
    let userRecordDataRaw = testMode ? await (await fetch(testRecord_URL)).json() : await (await fetch(URLbase_record + username)).json();
    let userRecordData = userRecordDataRaw.records;

    // 不足データを追加
    // 2024-11-26: Theatore Creatore (ULTIMA 15.3)
    // const theatorecreatoreElm = document.querySelector("#fix_theatorecreatore");
    // // playerDataからもしデータがあったら一旦消す
    // userRecordData = userRecordData.filter((data) => !(data.id === "0c5ee63ee594d669" && data.diff === "ULT"));
    // if (theatorecreatoreElm.value !== "") {
    //     const score = parseInt(theatorecreatoreElm.value);
    //     const isAJ = document.querySelector("#fix_theatorecreatore_aj").checked;
    //     const isFC = document.querySelector("#fix_theatorecreatore_fc").checked;

    //     userRecordData.push({
    //         id: "0c5ee63ee594d669",
    //         diff: "ULT",
    //         level: 15,
    //         title: "Theatore Creatore",
    //         const: 15.3,
    //         score: score,
    //         rating: calculateRating(score, 15.3),
    //         is_const_unknown: false,
    //         is_clear: true,
    //         is_fullcombo: isFC,
    //         is_alljustice: isAJ,
    //         is_fullchain: false,
    //         genre: "ORIGINAL",
    //         updated_at: "1970-01-01T00:00:00Z",
    //         is_played: true,
    //         version: "VERSE"
    //     })
    // }
    // データ追加されたらここまで消す

    // 不足レコードを追加し、ベスト枠・新曲枠を計算
    userRecordData = complementRecord(userRecordData);
    // 自力で計算した細かいレートを使ったほうがベスト枠正しく出る
    userRecordData = userRecordData.sort((a, b) => b.ratingDetailed - a.ratingDetailed);
    const userBestData = calculateBest(userRecordData, BEST_COUNT);
    const userNewData = calculateNew(userRecordData, NEW_COUNT);

    document.getElementById("pre-render-area").style.display = "block";

    // 描画
    // 初期化
    initializeArea();
    removeButtons();

    // ヘッダ(著作権モード関連)
    // if (document.getElementById("chunibestimgnew_copyrightmode").checked) {
    //     document.getElementById("img-logoimg").style.display = "none";
    //     document.getElementById("img-title").innerText = "CHUNITHM ベスト枠・新曲枠対象楽曲";
    //     document.getElementById("img-header-text").style.marginLeft = "0px";
    // } else {
    //     document.getElementById("img-logoimg").style.display = "block";
    //     document.getElementById("img-title").innerText = "ベスト枠・新曲枠対象楽曲";
    //     document.getElementById("img-header-text").style.marginLeft = "20px";
    // }
    document.getElementById("img-logoimg").style.display = "block";
    document.getElementById("img-title").innerText = "ベスト枠・新曲枠対象楽曲";
    document.getElementById("img-header-text").style.marginLeft = "20px";

    // 更新・生成日時
    const updatedDatetime = userProfile.updated_at.replaceAll("-", "/").replaceAll("T", " ").substring(0, 19);
    document.getElementById("v-update-dt").innerText = updatedDatetime;
    const now = new Date();
    const generatedDatetime = toISOStringWithTimezone(now).replaceAll("-", "/").replaceAll("T", " ").substring(0, 19);
    document.getElementById("v-generate-dt").innerText = generatedDatetime;

    // プレイヤー名・レート
    document.getElementById("v-player-name").innerText = userProfile.player_name;
    document.getElementById("v-current-rating").innerText = userProfile.rating;
    document.getElementById("v-best-rating").innerText = calclateAverageRating(userBestData, BEST_COUNT).toFixed(4);
    document.getElementById("v-new-rating").innerText = calclateAverageRating(userNewData, NEW_COUNT).toFixed(4);

    // ベスト枠・新曲枠の楽曲のうち最新のものの日付を取得
    let newestDate = new Date("1970/01/01");
    let bestNewIntegratedData = userBestData.concat(userNewData);
    for (let i = 0; i < bestNewIntegratedData.length; i++) {
        const date = getUpdatedDate(bestNewIntegratedData[i].updated_at);
        if (date > newestDate) {
            newestDate = date;
        }
    }

    renderSong(userBestData, document.getElementById("img-best-songs"), newestDate);
    renderSong(userNewData, document.getElementById("img-new-songs"), newestDate);

    if (document.getElementById("chunibestimgnew_showprev").checked) {
        document.getElementById("generate-image").style.display = "block";
    } else {
        renderImage();
    }

    loadingState(false);
}

function renderSong(data, area, newestDateInitial) {
    for (let i = 0; i < data.length; i++) {
        // ジャケットURL取得
        let filename = md5(data[i].title + data[i].artist) + ".webp";
        let jacketURL = URLbase_jacket + filename;

        // 難易度・ランプ・ランク・スコア取得
        let musicDiff = data[i].diff.toLowerCase();

        let musicLamp = "";
        let musicLampColor;
        if (data[i].is_alljustice) {
            musicLamp = "ALL JUSTICE";
            musicLampColor = "rgb(255, 223, 117)";
        } else if (data[i].is_fullcombo) {
            musicLamp = "FULL COMBO";
            musicLampColor = "#fff";
        }

        let musicScore = data[i].score;
        let musicScoreRank, rankColor;
        if (musicScore < 5e5) {
            musicScoreRank = "D";
            rankColor = "#888888";
        } else if (musicScore < 6e5) {
            musicScoreRank = "C";
            rankColor = "#b87333";
        } else if (musicScore < 7e5) {
            musicScoreRank = "B";
            rankColor = "#03b1fc";
        } else if (musicScore < 8e5) {
            musicScoreRank = "BB";
            rankColor = "#03b1fc";
        } else if (musicScore < 9e5) {
            musicScoreRank = "BBB";
            rankColor = "#03b1fc";
        } else if (musicScore < 925000) {
            musicScoreRank = "A";
            rankColor = "#fc6203";
        } else if (musicScore < 950000) {
            musicScoreRank = "AA";
            rankColor = "#fc6203";
        } else if (musicScore < 975000) {
            musicScoreRank = "AAA";
            rankColor = "#fc6203";
        } else if (musicScore < 990000) {
            musicScoreRank = "S";
            rankColor = "#fc8403";
        } else if (musicScore < 1e6) {
            musicScoreRank = "S+";
            rankColor = "#fc8403";
        } else if (musicScore < 1005000) {
            musicScoreRank = "SS";
            rankColor = "#fc8403";
        } else if (musicScore < 1007500) {
            musicScoreRank = "SS+";
            rankColor = "#fc8403";
        } else if (musicScore < 1009000) {
            musicScoreRank = "SSS";
            rankColor = "#ffdf75";
        } else {
            musicScoreRank = "SSS+";
            rankColor = "#03fc1c";
        }

        // 描画
        let musicBlock = document.createElement("div");
        musicBlock.className = "img-song-block";

        let musicBlockUpper = musicBlock.appendChild(document.createElement("div"));
        musicBlockUpper.className = "img-song-block-upper";

        // データ部
        let musicBlockData = musicBlockUpper.appendChild(document.createElement("div"));
        musicBlockData.className = "img-song-block-data";

        let musicRank = musicBlockData.appendChild(document.createElement("div"));
        musicRank.className = "img-song-rank";
        musicRank.innerText = "#" + String(i + 1);

        let musicConstTxt = musicBlockData.appendChild(document.createElement("div"));
        musicConstTxt.className = "img-song-txt";
        musicConstTxt.innerText = "CONST";

        let musicConst = musicBlockData.appendChild(document.createElement("div"));
        musicConst.className = "img-song-const";
        musicConst.innerText = data[i].const.toFixed(1);

        let ratingArrow = musicBlockData.appendChild(document.createElement("div"));
        ratingArrow.className = "img-song-arrow";
        ratingArrow.innerText = "▼";

        let muscRatingTxt = musicBlockData.appendChild(document.createElement("div"));
        muscRatingTxt.className = "img-song-txt";
        muscRatingTxt.innerText = "RATING";

        let musicRating = musicBlockData.appendChild(document.createElement("div"));
        musicRating.className = "img-song-const";
        musicRating.innerText = data[i].rating.toFixed(2);

        // ジャケット部
        let musicBlockImg = musicBlockUpper.appendChild(document.createElement("div"));
        musicBlockImg.className = "img-song-block-img";

        let musicJacket = musicBlockImg.appendChild(document.createElement("img"));
        musicJacket.src = jacketURL;
        musicJacket.setAttribute("crossOrigin", "anonymous");
        // if (document.getElementById("chunibestimgnew_copyrightmode").checked) {
        //     musicJacket.src = "../commonassets/images/ban.png";
        // } else {
        //     musicJacket.src = jacketURL;
        // }

        if (document.querySelector("#chunibestimgnew_shownew").checked && getUpdatedDate(data[i].updated_at).getTime() === newestDateInitial.getTime()) {
            let musicNewest = musicBlockImg.appendChild(document.createElement("div"));
            musicNewest.className = "img-new-emblem";
            musicNewest.innerText = "NEW!!";
        }

        let musicDiffEmblem = musicBlockImg.appendChild(document.createElement("div"));
        musicDiffEmblem.className = "img-diff-emblem " + musicDiff;

        if (musicLamp !== "") {
            let musicLampTxt = musicBlockImg.appendChild(document.createElement("div"));
            musicLampTxt.className = "img-score-lamp-highcontrast";
            musicLampTxt.innerText = musicLamp;
            musicLampTxt.style.color = musicLampColor;
        }

        let musicScoreRankTxt = musicBlockImg.appendChild(document.createElement("div"));
        musicScoreRankTxt.className = "img-score-rank-highcontrast";
        musicScoreRankTxt.innerText = musicScore.toLocaleString() + " ";
        let musicRankTxt = musicScoreRankTxt.appendChild(document.createElement("span"));
        musicRankTxt.innerText = musicScoreRank;
        musicRankTxt.style.color = rankColor;

        let musicBlockLower = musicBlock.appendChild(document.createElement("div"));
        musicBlockLower.className = "img-song-block-lower";

        let musicTitle = musicBlockLower.appendChild(document.createElement("div"));
        musicTitle.className = "img-song-block-lower-title";
        musicTitle.innerText = data[i].title;

        area.appendChild(musicBlock);
    }

    // ダミー（高さ0の要素）を4つ追加し、flex内の左寄せを実現
    for (let i = 0; i < 4; i++) {
        let dummy = document.createElement("div");
        dummy.className = "img-song-block-dummy";
        area.appendChild(dummy);
    }
}

function download() {
    const now = new Date();
    const downloadable = document.createElement("a");
    downloadable.href = document.getElementById("result-img").src;
    downloadable.download = "best_" + String(Math.floor(now.getTime() / 1000)) + ".jpg";
    downloadable.click();
}

function share() {
    if (!navigator.canShare) { alert("このブラウザはシェアに対応していません。"); return; }
    const img = document.getElementById("result-img");
    const cBase = document.getElementById("imgcanvasbase");
    const canvas = cBase.appendChild(document.createElement("canvas"));
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.display = "none";
    const canvasContext = canvas.getContext("2d");
    canvasContext.drawImage(img, 0, 0);
    const dataURL = canvas.toDataURL("image/jpeg");
    const blob = toBlob(dataURL);
    const imageFile = new File([blob], "image.jpg", {
        type: "image/jpeg",
    });
    navigator.share({
        files: [imageFile],
    }).then(() => {
        canvas.remove();
    }).catch((error) => {
        console.log(error);
        canvas.remove();
    });
}
