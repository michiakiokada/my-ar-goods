/**
 * 小さな森の研究所 - メインARコントローラー
 */

// ==========================================
// 設定パラメータ
// ==========================================
const CONFIG = {
  // 現在のカメラ番号（1号機）
  CURRENT_CAMERA_ID: 1,
  TOTAL_CAMERAS: 2, // 将来カメラを増やす場合はここを変更
  NEXT_CAMERA_URL: "index2.html", // 8秒未認識時のリダイレクト先（別カメラ）

  // オートチューナー待機時間（8秒）
  SCAN_TIMEOUT_MS: 8000,

  // スーパーリーチ発展確率（1/20 = 5%）
  SUPER_REACH_PROBABILITY: 1 / 20,

  // スーパーリーチ演出リスト（spフォルダ内）
  REACH_FILES: [
    "./sp/reach1.html", // ◯群
    "./sp/reach2.html", // コラボスイッチ
    "./sp/reach3.html", // 停電フリーズ
    "./sp/reach4.html"  // 顕微鏡ズーム
  ]
};

// 状態管理
let tunerTimer = null;
let tunerStartTime = 0;
let isRecognized = false;
let tunerInterval = null;

// DOM要素
const tunerBar = document.getElementById("tuner-bar");
const tunerTimeText = document.getElementById("tuner-time");
const discoveryToast = document.getElementById("discovery-toast");
const scanGuide = document.getElementById("scan-guide");
const fadeCurtain = document.getElementById("fade-curtain");

// ==========================================
// オートチューナー処理（8秒カウントダウン）
// ==========================================
function startAutoTuner() {
  if (isRecognized) return;

  tunerStartTime = Date.now();
  
  // ゲージのアニメーション更新（毎フレーム）
  tunerInterval = setInterval(() => {
    const elapsed = Date.now() - tunerStartTime;
    const progress = Math.min((elapsed / CONFIG.SCAN_TIMEOUT_MS) * 100, 100);
    const remainSec = Math.max(Math.ceil((CONFIG.SCAN_TIMEOUT_MS - elapsed) / 1000), 0);

    if (tunerBar) tunerBar.style.width = `${progress}%`;
    if (tunerTimeText) tunerTimeText.textContent = `チャンネル切替まで ${remainSec}秒`;

    if (elapsed >= CONFIG.SCAN_TIMEOUT_MS) {
      clearInterval(tunerInterval);
      triggerCameraRedirect();
    }
  }, 100);
}

// 別の観察カメラへリダイレクト
function triggerCameraRedirect() {
  if (isRecognized) return;
  console.log("対象が見つからないため、次の観察カメラへオートスイッチします");
  
  fadeCurtain.classList.add("active");
  setTimeout(() => {
    window.location.href = CONFIG.NEXT_CAMERA_URL;
  }, 600);
}

// チューナー停止（グッズ認識時）
function stopAutoTuner() {
  if (tunerInterval) clearInterval(tunerInterval);
  if (tunerBar) tunerBar.style.width = "100%";
  if (tunerTimeText) tunerTimeText.textContent = "観察対象をロックオン！";
}

// ==========================================
// スキャン認識時の処理（通常AR vs スーパーリーチ）
// ==========================================
function onTargetDetected(targetIndex) {
  if (isRecognized) return;
  isRecognized = true;

  stopAutoTuner();
  scanGuide.classList.add("found");

  // スマホに「前回収穫・観測できたカメラ番号」を保存
  localStorage.setItem("last_observed_camera", CONFIG.CURRENT_CAMERA_ID);

  // 1. 確率抽選（1/20 でスーパーリーチ発展！）
  const isSuperReach = Math.random() < CONFIG.SUPER_REACH_PROBABILITY;

  if (isSuperReach) {
    // ★スーパーリーチ発展！
    console.log("★★★ 特異反応検知！スーパーリーチへ発展 ★★★");
    
    // 4種からランダムで1つ決定
    const randomReach = CONFIG.REACH_FILES[Math.floor(Math.random() * CONFIG.REACH_FILES.length)];

    // 1秒タメを作ってからスーパーリーチページへ遷移
    setTimeout(() => {
      fadeCurtain.classList.add("active");
      setTimeout(() => {
        window.location.href = randomReach;
      }, 600);
    }, 800);

  } else {
    // ☆通常モード（日常の観察）
    console.log("通常観測を開始しました");
    showDiscoveryToast(`【観察カメラ ${CONFIG.CURRENT_CAMERA_ID}号】にて対象を観測！`);
  }
}

// 発見ログトースト表示
function showDiscoveryToast(msg) {
  if (!discoveryToast) return;
  discoveryToast.textContent = msg;
  discoveryToast.classList.add("show");

  setTimeout(() => {
    discoveryToast.classList.remove("show");
  }, 4000);
}

// ==========================================
// ページ初期化
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  // 前回観測したカメラの履歴があればコンソール等に記録
  const lastCam = localStorage.getItem("last_observed_camera");
  if (lastCam) {
    console.log(`前回観測ログ: 観察カメラ ${lastCam}号`);
  }

  // A-Frame / MindAR の読み込み準備
  const sceneEl = document.querySelector("a-scene");
  
  if (sceneEl) {
    sceneEl.addEventListener("renderstart", () => {
      console.log("ARカメラ起動完了。オートチューナーを開始します");
      startAutoTuner();
    });
  } else {
    // A-frameがない場合のフォールバックテスト用
    setTimeout(startAutoTuner, 500);
  }

  // ターゲット認識イベントリスナーの設定
  const targets = document.querySelectorAll("[mindar-image-target]");
  targets.forEach((target, index) => {
    target.addEventListener("targetFound", () => {
      onTargetDetected(index);
    });

    target.addEventListener("targetLost", () => {
      console.log("ターゲットを見失いました");
    });
  });
});