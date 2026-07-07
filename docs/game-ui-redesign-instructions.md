# 指示書: Word Order Quest Game画面のスマホゲーム風リデザイン

あなた(実装エージェント)への指示です。この文書だけで作業が完結するように書いてあります。**作業前に必ず `app.js` と `style.css` の全体、そしてデザインカンプ `docs/game-mock.html` を読んでから着手してください。**

> **最重要: 見た目の正はデザインカンプである。**
> - Game画面 → `docs/game-mock.html`(6状態: 通常/登場/正解演出/danger/ポーズ/リザルト。**バンクのカードを実際にタップすると遊べる**: 正解で飛翔演出、誤答で反撃、全文完成で撃破→次モンスター登場までループする)
> - Home / Unit画面 → `docs/home-mock.html`(2ビュー: Home/Units)
>
> 視覚デザイン(色・余白・角丸・影・アニメーション・レイアウト)はすべてカンプで確定済み。CSSは原則そのままコピーし、**独自の見た目判断をしないこと**。この文書の3章以降のレイアウト説明は、カンプを読むための補助と考えてよい。カンプと本文が食い違う場合はカンプを優先する。参考スクリーンショットが `docs/mock-screenshots/` にある。

## 0. ゴール(2行で)

学習アプリ寄りの現Game画面を、縦長スマホゲームの画面(上部HUD / 中央バトルステージ / 下部単語カード)にリデザインし、演出とHaptics抽象層を追加する。あわせてHome / Unit画面も同じダークテーマに統一し、アプリ全体の体験を揃える。**ゲームロジックとlesson JSON構造は変えない。**

## 1. プロジェクトの場所と構成

- ルート: `/Users/kusakabesatsu/Desktop/claude/word-order-quest/`
- 変更対象: `index.html` / `style.css` / `app.js` の3ファイルのみ
- 変更禁止: `data/courses.json`、`data/lessons/**/*.json`、`data_example/`(教材スキーマは現状維持)
- vanilla HTML/CSS/JSのみ。外部ライブラリ・ビルドツール・フレームワーク禁止。
- `monster.html` と `preview (1).html` は過去のプレビュー用の残骸。触らない。

## 2. 既存アーキテクチャ(必読・これに従うこと)

- SPA。`index.html` の `<div id="app">` に、画面ごとに `app.innerHTML = ...` で全描画する方式。イベントリスナーは描画のたびに貼り直す。この方式は維持する。
- 全状態は `app.js` 冒頭の `state` オブジェクト1つに集約。画面は `state.currentScreen`("home" | "units" | "game" | "custom" | "settings")で切替、`render()` が振り分ける。
- Game画面の主要関数(名前は変えずに中身を改修する):
  - `renderGame()` — Game画面のHTML全体を組み立てる。**今回の主戦場。**
  - `renderGameState()` — 問題切替時の部分更新(チャンクレール・解答欄・バンク・タイマー)。
  - `chooseToken(token, element)` — カードタップ時の正誤判定。正解→`answer`にpush、不正解→時間ペナルティ`WRONG_PENALTY_SECONDS`(4秒)+`shakeAnswerZone()`+モンスター`attack`再生。
  - `completeQuestion()` — 全文完成。スコア加算、3連続正解ごとに`STREAK_BONUS_SECONDS`(3秒)回復、モンスター`defeated`、720ms後に`nextQuestion()`へ自動遷移。
  - `startTimer()` / `stopTimer()` / `updateTimer()` — 100ms間隔、`roundStartedAt`との実時間差分で減算。`stageLocked`中はearly return。
  - `renderTimer()` — 残り時間表示とバー更新。`<=10s`でwarning、`<=5s`でdangerクラスをトグル済み。
  - `handleTimeUp()` / `showGameOver()` — 時間切れ。現状は`#feedback`パネルにリザルトHTMLを流し込む実装。
  - `setMonsterState()` / `setMonsterHp()` / `setMonsterCombo()` / `playMonsterOnce()` / `syncMonsterTimerState()` — CSS製モンスターの状態機械。状態: idle / warning / danger / hit / attack / defeated。`--hp`カスタムプロパティでHPバー連動済み。
  - `playEffect(type)` — WebAudioの正解/不正解SE。`speakEnglish()` — 読み上げ。両方そのまま使う。
- モンスターは `renderMonsterMarkup()` が返す純CSS構造(`monster__*`クラス群、style.css 487行目以降)。**マークアップとアニメーションは資産としてほぼ流用**し、配置と大きさだけ変える。
- localStorageキーは `STORAGE` 定数と `woq:progress:*`。変更禁止。

## 3. 新しいGame画面レイアウト仕様

Game画面のみ、100dvhの縦フレックス1画面(スクロールなし)に作り替える。他画面(Home/Units/Custom/Settings)のレイアウトは現状維持。

```
┌──────────────────────────────┐
│ HUD(1行〜2行、高さ固定・薄く)      │ ← ポーズ⏸ / TIMEバー+残秒 / SCORE / COMBO
├──────────────────────────────┤
│                              │
│  Battle Stage(flex:1)         │ ← モンスター(HP付き)+ 日本語原文
│                              │    + 語順チャンクレール + エフェクト層
├──────────────────────────────┤
│ Your sentence(解答欄)          │ ← 選んだカードが並ぶ。高さ2行分を予約
├──────────────────────────────┤
│ Word bank(下部カード群)         │ ← 親指ゾーン。大きいカード
│              + safe-area余白    │
└──────────────────────────────┘
```

実装方針:

- `renderGame()` 内でルートを `<div class="game-root" id="gameRoot">` として組み、この中を `display:flex; flex-direction:column; height:100dvh`(フォールバックに`100vh`を先に書く)にする。
- Game画面表示中は `document.body.classList.add("in-game")` し、離脱時(`goHome`/`goUnits`/`openSettings`)に外す。`body.in-game` では `.app-shell` のmargin/border/角丸を消して全画面化(既存の`@media (max-width:560px)`の見た目を全幅に適用するイメージ)。
- デスクトップでもゲーム画面は `max-width: 520px` 程度で中央寄せの縦長カラムにする(スマホゲームの体裁を保つ)。
- `overflow: hidden` で画面スクロールを禁止。**チャンク数が多いステージ(語数10以上)でも溢れないこと**を必ず確認する。溢れる場合はバンク部分のみ内部スクロール可(`overflow-y:auto`)にしてよいが、初期表示で全カードが見えるのが理想。

### 3.1 上部HUD

現在の `renderHeader()` + `.stats` + `.toolbar` + `.time-panel` に分散している情報を、1つのコンパクトなHUDバーに統合する。Game画面では `renderHeader()` を呼ばない。

- 左: ポーズボタン(⏸アイコン、44×44pxのタップ領域、`id="pauseBtn"`)
- 中央: 「TIME」ラベル+横長タイムバー+残り秒数(`0.1秒`刻み表示は維持。既存の `#timeLeft` / `#progressBar` / `#timeProgress` / `#timeReadout` のidは流用してよい)
- 右: SCORE(`#score`)とCOMBO(`#streak`、"×3" のようなゲーム表記)。正解数(`#questionCount`)はHUDでは非表示にしてよいが、リザルト画面には出すこと。
- フォントは小さく(10〜12px、ラベルはuppercase+letter-spacing)、数値は太く。ゲームHUDらしい密度にする。
- 「ホームに戻る」「単元一覧に戻る」「共通設定」ボタンはHUDから排除し、**ポーズメニューの中に移す**(下記3.5)。

### 3.2 中央バトルステージ

- `flex:1` で残り空間を占有。中に重ね順で:
  1. 背景レイヤー(薄いグラデ、任意で遠景)
  2. モンスター(**§11のロースター統合で全面差し替え**。サイズ感は `width: min(200px, 45vw)` 程度、**学習情報より目立ちすぎない大きさ**)
  3. 敵ネームプレート `.foe-plate`(名前+Lv・HPバー・ボス残バー●●)— 旧 `monster__hud` は使わない。詳細は§11.5
  4. 日本語原文(`#sourceJa`)— モンスターの下または上に常時表示。既存の白パネルではなく、ゲームの吹き出し/クエストボード風にリスタイルしてよい
  5. 語順チャンクレール(`#chunkRail` / `renderChunks()`)— 現在選択中チャンクの `.chunk-inline.active` 強調は維持・強化(光る枠、パルス等)
  6. 最前面にエフェクト層 `<div class="fx-layer" id="fxLayer"></div>`(`position:absolute; inset:0; pointer-events:none`)— 攻撃斬撃・ヒットスパーク・ダメージ数字などをここに出す
- `panel-head`("Japanese source" 等の英字ラベル)は撤去または最小化し、学習情報そのものを主役にする。

### 3.3 解答エリア(Your sentence)

- バトルステージ直下。既存 `#answerZone` / `renderAnswer()` を流用。
- 高さはカード2行ぶんを**固定的に予約**(`min-height`)し、カード追加でレイアウトが跳ねないようにする。
- 空のときのプレースホルダ文言(現在 `.answer-zone.empty::before`)は維持してよいが短く。
- チャンクモード時はチャンク区切りが見えるように、カード間に薄い区切りまたはカード自体の境界で表現(現状のカード並びで十分なら流用)。
- 正解カードは即時反映(既存挙動)。`.token.pop` アニメは維持。
- **カード飛翔演出**: 正しいカードをタップすると、カードがバンクから解答欄のチップ位置まで放物線を描いて飛び(約330ms)、残ったバンクカードは滑って隙間を詰める(FLIP、約260ms)。実装はカンプ内の「=== 移植対象 ===」セクションを参照(8章に組み込み手順)。
- 全文完成時はこのエリアから攻撃演出が発火する(3.6)。

### 3.4 下部単語カード(Word bank)

- 既存 `#bank` / `renderBank()` / `makeTokenButton()` を流用。
- カードを大型化: `min-height: 56px`、`font-size: 17px` 以上、角丸大きめ、押した感のある `:active` スタイル(`transform: scale(0.96)` 等)。丸形でなくてよいが「ゲームのボタン」に見えること。
- タップ操作のみ(現状どおり。ドラッグ実装は不要)。
- コンテナ下部に `padding-bottom: calc(12px + env(safe-area-inset-bottom))` を入れ、iPhoneのホームバーと干渉しないようにする。
- `-webkit-tap-highlight-color: transparent` は既にある。`touch-action: manipulation` をボタンに追加してダブルタップズームを防ぐ。

### 3.5 ポーズ機能(新規実装)

**ポーズは現在存在しない。新規に作る。**

- `state.paused`(boolean)を追加。
- `pauseGame()`: `stopTimer()` を呼び、`state.paused = true`、フルスクリーンオーバーレイ(半透明黒+中央メニュー)を表示。メニュー内容: 「再開」「もう一度」(`restartGame`)「単元一覧」(customプレイ時は非表示、既存の `state.selectedCourseId !== "custom"` 分岐を踏襲)「ホーム」「共通設定」。
- `resumeGame()`: オーバーレイを消し、`state.paused = false`、**`state.roundStartedAt = Date.now()` にリセットしてから** `startTimer()`。これを忘れるとポーズ中の時間が再開直後にまとめて減算される(`updateTimer()` が `roundStartedAt` との差分で減算する実装のため)。
- ポーズ中はカードタップ無効(`chooseToken` の先頭で `state.paused` をチェック、またはオーバーレイが全面を覆うのでpointer-eventsで防ぐ。両方入れるのが安全)。
- 既知の類似バグに注意: `completeQuestion()` → 720ms後 `nextQuestion()` の間 `stageLocked` でタイマーが止まるが、`roundStartedAt` が更新されないため、次のtickでロック中の時間もまとめて減算されている。**`nextQuestion()` 内で `state.roundStartedAt = Date.now()` を追加して直すこと**(1行。プレイヤー有利になる方向の修正なので入れてよい)。

### 3.6 ゲーム演出

CSSアニメーション主体で以下を実装する。モンスター状態機械(`setMonsterState` / `playMonsterOnce` / `syncMonsterTimerState`)は既存のまま活かす。

1. **全文完成 = 攻撃**: `completeQuestion()` で、fx-layerに斬撃(白い斜めの光の線)またはヒットスパークを一瞬表示 → 既存の `setMonsterState("defeated")` の消滅アニメへ。任意で「+12」等のスコアポップをfx-layerに出す。
1-b. **次の問題 = モンスター登場**: `nextQuestion()` で新モンスターが上から降ってきて着地(squash)する演出(カンプの `monster--entrance`、約750ms)。HPは全回復、ステータスは「READY」表示。`playMonsterOnce("entrance")` で再生できるよう、`playMonsterOnce` のタイムアウト時間を状態別マップ(`{ attack: 760, entrance: 750, その他: 500 }`)に変えること。
2. **間違い = モンスター反撃 + 画面シェイク**: 既存の `playMonsterOnce("attack")` + `shakeAnswerZone()` に加え、`#gameRoot` に `.screen-shake` クラスを一瞬付与して画面全体を揺らす(既存 `@keyframes shake` を流用可)。付け外しは既存コードの `void element.offsetWidth` リフロー再生パターンに倣う。
3. **残り10秒 = warning**: `renderTimer()` が既にwarning/dangerを判定している。同じ判定で `#gameRoot` にも `warning` / `danger` クラスをトグルする。warningでは背景をわずかに暗く/色温度を変える程度。
4. **残り5秒 = danger**: 画面縁が赤く点滅するビネット。`#gameRoot.danger::after` に `position:absolute; inset:0; pointer-events:none; box-shadow: inset 0 0 40px 12px rgba(239,68,68,.45)` + 点滅keyframes、といった実装を推奨。モンスターのdanger化(既存)と同期する。
5. **時間切れ**: 現在 `showGameOver()` が `#feedback` にHTMLを流し込んでいるが、これを**フルスクリーンのリザルトオーバーレイ**(ポーズと同系デザイン)に変える。表示: 「TIME UP」、スコア、正解数、最後の正解文、ボタン(もう一度 / 単元一覧 / ホーム)。既存のボタンid(`#retryBtn` 等)とハンドラ配線は流用してよい。
6. 正解時の `#feedback` 表示(正解文+ボーナス秒)は、レイアウトを跳ねさせないよう**バトルステージ内の絶対配置トースト**に変える(720msの自動遷移中に表示されて消える)。
7. `@media (prefers-reduced-motion: reduce)` ブロックが既にモンスター向けにある。新設アニメ(シェイク・ビネット点滅・斬撃)もここで抑制すること。

### 3.7 Haptics抽象層(新規実装)

`app.js` に以下を追加する。**振動の実装詳細はこの関数1箇所に閉じ込め、呼び出し側は `playHaptic("correct")` のように型名しか知らない**こと(将来 `@capacitor/haptics` に差し替えるため)。

```js
const HAPTIC_PATTERNS = {
  tap: 10,
  correct: 20,
  wrong: [60, 40, 60],
  warning: [30, 50, 30],
  success: [20, 40, 80],
  timeup: [100, 60, 100]
};

function playHaptic(type) {
  // Capacitor移行時はここだけ差し替える
  const pattern = HAPTIC_PATTERNS[type];
  if (!pattern) return;
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}
```

(パターン値は調整可。構造はこの形を守る。)

呼び出し箇所:

| タイミング | 場所 | type |
|---|---|---|
| 単語カードタップ(正誤判定前) | `chooseToken()` 先頭 | `tap` |
| 正しい単語 | `chooseToken()` 正解分岐 | `correct` |
| 間違い | `chooseToken()` 不正解分岐 | `wrong` |
| 残り5秒を切った瞬間 | `updateTimer()` 内 | `warning` |
| 全文完成 | `completeQuestion()` | `success` |
| 時間切れ | `handleTimeUp()` | `timeup` |

注意点:

- 正解時は `tap` と `correct` が連続発火して二重振動になる。`tap` は判定前に鳴らし、直後の `correct`/`wrong` が上書きする形でよい(`navigator.vibrate` は後発呼び出しが先行をキャンセルする仕様なので実害なし)。
- `warning` は**5秒を跨いだ瞬間に1回だけ**。100msごとの `updateTimer()` で毎tick発火させないこと。`state.dangerNotified` のようなフラグを追加し、5秒超に回復(連続正解ボーナス)したらフラグを戻す。
- iOS SafariのWeb版では `navigator.vibrate` は存在しない。ガードがあるので無音で通ること(エラーを出さないこと)を確認。

## 4. スマホ最適化の必須要件

- 基準ビューポート: iPhone(390×844)。この画面で**縦スクロールが一切発生しない**こと。
- タップターゲット: 単語カード56px以上、ポーズ44px以上。
- HUDの数値・タイムバーが見切れないこと(safe-area-inset-top も考慮: `padding-top: env(safe-area-inset-top)` をHUDに)。
- モンスターが原文・チャンクレールを隠さないこと。縦が狭い端末(iPhone SE: 375×667)ではモンスターをさらに縮小(`clamp()` や `@media (max-height: 700px)`)。
- 横向き・タブレットは壊れていなければよい(最適化不要)。

## 5. 触ってはいけないもの / 壊してはいけないもの

- lesson JSONスキーマ(`stages[].chunks[].ja/en`)と `validateLesson()`
- localStorageキーと進捗保存ロジック(`updateProgress` 系)
- Home / Units / Custom / Settings 画面の**動作**(見た目は9章に従いダークテーマ化するが、ボタン・遷移・保存の挙動は変えない)
- チャンク/単語モード両対応(`state.mode`)。**両モードでテストすること**(単語モードはカード数が倍増する)
- 読み上げ(`speakEnglish`)、SE(`playEffect`)、連続正解ボーナス、誤答ペナルティ、ステージシャッフル(`makeStageOrder`)
- fallback教材動作(`file://` で開いたときの `fetchWarning` 表示。Game画面では通知をHUD下に小さく出すか、Home画面でのみ表示に変更してよい)

## 6. 実装上の落とし穴(既存コード由来)

1. `app.innerHTML` 全置換方式のため、**部分更新関数(`renderTimer` 等)は毎回 `app.querySelector` でnullガード**している。新設DOMも同じ作法で書く(要素がない画面でtickが走っても落ちないように)。
2. モンスターのワンショットアニメは「クラスを外す → `void offsetHeight` でリフロー → 付け直す」で再生している(`setMonsterState`、`markWrongChoice`)。新設アニメも同じパターンを使う。
3. `render()` は `state.currentScreen !== "game"` のとき `stopTimer()` を呼ぶが、`startLesson()`/`restartGame()` は `render()` を経由せず `renderGame()` を直接呼ぶ。画面遷移系を触るときはタイマーの止め忘れ/二重起動(`startTimer` を2回呼ぶと `timerId` がリークして倍速で減る)に注意。ポーズ実装時は必ず `stopTimer()` → `startTimer()` の対で。
4. `showFeedback()` はHTML文字列を受けてボタンのリスナーを後付けしている。リザルトをオーバーレイ化する際も同じ方式(innerHTML後にaddEventListener)でよい。
5. ユーザー入力由来の文字列は必ず `escapeHtml()` を通す(既存コードの慣習)。

## 7. 検証手順(実装後に必ず実施)

```bash
cd /Users/kusakabesatsu/Desktop/claude/word-order-quest
python3 -m http.server 8000
```

ブラウザ(devtoolsのiPhone 12/13/14相当 390×844エミュレーション)で `http://localhost:8000/` を開き:

1. Home → 中1英文法 → be動詞 でゲーム開始。HUD・バトルステージ・解答欄・バンクが1画面に収まりスクロールしないこと
2. 正解カードを順にタップ → カードが解答欄へ飛び、残カードが詰まる → 読み上げ・モンスターhit → 全文完成で攻撃演出+defeated → 720ms後に次の問題で新モンスターが降ってくる(entrance演出+HP全回復)
3. わざと間違える → カード揺れ+画面シェイク+モンスター反撃+残り時間-4秒
4. 放置して残り10秒(warning)→5秒(danger、画面縁の赤点滅)→時間切れ(リザルトオーバーレイ)を目視
5. リザルトから「もう一度」→ タイマー・スコア・モンスターが正しくリセット
6. ポーズ → 数秒待つ → 再開 → **残り時間がポーズ前と同じ**であること(まとめて減算されないこと)
7. 設定で「単語」モードに切替えて再プレイ(カード数が多いステージでレイアウト崩れがないか)
8. カスタム練習(JSON貼り付け)でも開始できること
9. Home/Units画面が `docs/home-mock.html` と一致し、Custom/Settings画面も同じダークテーマで成立していること(全画面の動作は従来どおり)
10. デスクトップ幅でもゲーム画面が中央寄せ縦長カラムで成立すること
11. コンソールにエラーが出ていないこと(特にiOSに`navigator.vibrate`がない場合を想定し、devtoolsで `delete navigator.vibrate` 相当の確認は不要だがガード漏れがないかコードを再確認)

## 8. デザインカンプ(`docs/game-mock.html`)の統合方法

カンプは実物の `renderMonsterMarkup()` と同じDOM構造・同じid(`#pauseBtn` `#timeLeft` `#progressBar` `#timeProgress` `#timeReadout` `#score` `#streak` `#sourceJa` `#chunkRail` `#answerZone` `#bank` `#questMonster` など)で書かれている。統合手順:

1. **HTML**: カンプの `.game-root` 内の構造を `renderGame()` が生成するHTMLにそのまま移植する。ただし `.mock-controls` とファイル末尾の `<script>`(モック状態切替用)は統合しない。カード・チャンク・答えの中身はモックでは固定値なので、既存の `renderChunks()` / `renderAnswer()` / `renderBank()` が生成する(生成クラス名はカンプと一致済み)。
2. **CSS**: カンプ `<style>` 内をstyle.cssへ移植する。
   - `:root` の `--g-*` 変数群〜オーバーレイ〜keyframes: そのまま追加コピー。
   - モンスター関連(`.monster` 〜 `@keyframes monsterDefeated`): style.cssの既存モンスターブロックを**カンプ版で置き換える**(ダーク背景向けに影・サイズ・combo非表示を調整済み。状態機械のクラス名・構造は同一なのでapp.jsの変更は不要)。
   - 既存の `.feedback` `.token` `.answer-zone` 等のライトテーマ用スタイルは**削除しない**。Custom画面のフィードバックや他画面で使われている。Game画面用の新スタイルは `.game-root` 配下のセレクタになっているので共存できる。ただし `.token` はグローバル名のままカンプで再定義しているため、`.game-root .token` にスコープするか、Game画面以外で `.token` が使われていないことを確認して差し替えるか、どちらかを選ぶこと(現状 `.token` はGame画面でしか使われていない)。
3. **JS配線(カンプのscriptは移植せず、既存関数を改修して同じ見た目を作る)**:
   - コンボ表示は `×${streak}` 形式(`#streak`)。コンボ加算時に `#comboBadge` へ `.combo-active` を付け直してパルス再生。
   - `renderTimer()` の warning/danger トグル対象に `#gameRoot` を追加(dangerビネットは `.game-root.danger::after` で発火)。
   - 誤答時: `#gameRoot` に `.screen-shake` をリフロー再生。
   - 正解時: `#fxSlash` `#fxScorePop` に `.play` をリフロー再生し、`#feedbackToast` を表示(既存 `showFeedback()`/`#feedback` はGame画面では使わない。時間切れリザルトは `#resultOverlay`、ポーズは `#pauseOverlay` を hidden 切替)。
   - スコアポップの数字は実際の獲得点(`base + timeBonus`)に差し替える。
   - `nextQuestion()`: `resetQuestion()` 後に `playMonsterOnce("entrance")` を呼び、登場演出を再生する(3.6の1-b参照)。
   - **カード飛翔演出の移植**: カンプの `<script>` 内「=== 移植対象 ===」で囲まれた3関数(`captureTokenRects` / `flyTokenToAnswer` / `playBankFlip`)と、CSSの `.token.fly-clone` ルールをそのままコピーする。WAAPI(`element.animate`)はブラウザネイティブAPIなので「外部ライブラリ禁止」に抵触しない。`chooseToken()` の正解分岐を次の順に変える:
     1. **再描画前**に `const fromRect = element.getBoundingClientRect();` と `const bankRects = captureTokenRects(bankEl);` を取得(bankEl = `#bank`)
     2. 既存どおり `state.answer.push(...)` → `renderGameState()`
     3. **再描画後**に `flyTokenToAnswer(answerZoneEl, token.id, fromRect);` と `playBankFlip(bankEl, bankRects);`
     - チップは飛翔中 `visibility:hidden` になり、着地時に関数側が `.pop` を再発火するので、`renderAnswer()` の既存 `lastPoppedId` popロジックとは競合しない(そのまま残してよい)。
     - `prefers-reduced-motion` 時は関数内部で自動スキップされる(チップが即時表示されるだけで機能は変わらない)。
     - モックの `mockChoose()` はデモ用の簡易ループなので移植しない。移植するのは上記3関数のみ。
4. カンプはブラウザで直接開いて確認できる(サーバー不要)。右上の「▸ MOCK STATE」で6状態(通常/登場/正解演出/danger/ポーズ/リザルト)を切替、URLハッシュ `#danger` 等でも指定可。実装後の見た目がカンプおよび `docs/mock-screenshots/` のスクリーンショットと一致することを目視確認すること。

## 9. Home / Unit画面のダークテーマ統一(`docs/home-mock.html`)

Game画面だけダークにすると遷移時に体験が分断されるため、Home / Unit画面も同じデザイントークンで統一する。カンプは `docs/home-mock.html`(「▸ MOCK STATE」または `#units` でビュー切替)。

1. **DOM構造は現状のまま**: カンプは `renderHome()` / `renderUnits()` の出力(`.app-header` `.toolbar` `.grid` `.card` `.progress-line` `.btn`)と同一構造で書かれている。app.jsのHTML生成は変えなくてよい(変える必要があるのはCSSのみ)。
2. **CSS**: style.cssのライトテーマのベーススタイル(`body`背景、`.app-shell`、`.app-header`、`h1`、`.card`、`.progress-line`、`.btn`、`.toolbar`、`.notice`)をカンプ版で置き換える。ポイント:
   - `body` 背景はアプリ全体で紺〜深紫のグラデ+星空になる(`background-attachment: fixed`)。
   - `.app-shell` は「白い浮き箱」をやめ全幅・背景透過に変わる。
   - `h1` は金グラデのロゴ表現(イタリック900)。Game画面ではヘッダー自体を使わないので競合しない。
   - カードは上端に金のアクセントライン(`.card::before`)、ホバーで浮く。
3. **Custom / Settings画面**: 専用カンプは無い。home-mockのトークン(`--g-*`)とボタン・パネルのスタイルを流用して同じ見た目に揃える。`.json-box` は元々ダークなのでほぼそのままでよい。`.segmented` はダーク背景に合うよう背景色だけ調整(active項目は金)。`.feedback` の good/bad 配色は明るいチップとしてダーク上でも成立するので変更は最小限でよい。
4. 完成後、Home → Unit → Game → リザルト → Home と一周して、テーマの断絶がないことを確認する。

## 10. 完了条件チェックリスト

- [ ] Game画面が縦長スマホゲームのHUD/ステージ/カード構成になっている
- [ ] TIMEバー・残秒・スコア・コンボ・ポーズが上部HUDに整理されている
- [ ] モンスターが中央ステージに統合され、HP・状態変化(idle/warning/danger/hit/attack/defeated/entrance)が機能している
- [ ] 問題切替時にモンスターの登場演出(entrance)が再生される
- [ ] 正解カードがバンクから解答欄へ飛び、残カードが滑って詰まる(reduced-motion時はスキップ)
- [ ] 単語カードが下部で大きく押しやすい(56px以上+safe-area対応)
- [ ] 正解・不正解・残り10秒・残り5秒・時間切れの演出がある
- [ ] ポーズ機能が動き、再開時に時間がずれない
- [ ] `playHaptic(type)` が1箇所に抽象化され、6箇所から呼ばれている
- [ ] Home/Unit画面が `docs/home-mock.html` と一致し、全画面でテーマが統一されている
- [ ] チャンク/単語両モード、カスタム練習、進捗保存、fallback教材が壊れていない
- [ ] 390×844で画面スクロールが発生しない
- [ ] `prefers-reduced-motion` で新設アニメも抑制される
- [ ] §11: 6種のモンスターがランダム出現し、各状態(hit/attack/defeated/entrance/warning/danger)が正しく再生される
- [ ] §11: Lvと色ティア(skinクラス)が撃破数に応じて変わり、hit中も色相が保持される
- [ ] §11: ボスが5体ごとに出現し、HP2本が次の問題へ引き継がれる(1問目完了でdefeatedしない)
- [ ] §11: チクタク撃破+2秒/ボス撃破+5秒が加算され、ポーズ・再開後もタイマーがずれない

## 11. モンスターロースター統合(抽選・レベル・色替え・ボスHP引き継ぎ)

旧ベースモンスター(`.monster`)は**全廃**し、`docs/monster-mock.html` のオリジナル6種に差し替える。見た目のCSSは同ファイルからコピーし、独自の見た目判断をしないこと。

### 11.1 ロースター(6種)

| species | クラス | 役割 | 備考 |
|---|---|---|---|
| `inky` | `.inky` | 通常 | インク壺スライム |
| `dust` | `.dust` | 通常 | 消しくずゴースト |
| `tome` | `.tome` | 通常 | 魔導書レキシコン |
| `pncl` | `.pncl` | 通常 | 鉛筆カキカキ |
| `clock` | `.clock` | 乱入(時間) | チクタク。撃破で**+2秒** |
| `dex` | `.dex` | ボス | グランデックス。HP2本、撃破で**+5秒** |

### 11.2 CSSの移植範囲(monster-mock.htmlから)

1. 各種の見た目: `/* ===== オリジナル…「名前」 ===== */` で始まる各`<style>`ブロック
2. 状態アニメ: `/* ==== 戦闘状態アニメ(オリジナル5体) ==== */` ブロック全部+カキカキのstyle内の状態アニメ部
3. 色替え: `.skin--*` クラス(COLOR VARIANTSセクション)
4. **移植しないもの**: `.statebar`(再生ボタン)と、ページ末尾の検証用`<script>`類

状態クラスは既存と同名(`monster--idle/warning/danger/hit/attack/defeated/entrance`)で、**各speciesのルート要素に付ける**前提でCSSが書かれている。`setMonsterState()`/`playMonsterOnce()`/durationマップ(hit 500 / attack 760 / entrance 750ms)は**変更不要**。CSSの定義順が優先順位を兼ねるため、**ブロックの順序を入れ替えないこと**。

### 11.3 DOM: `renderMonsterMarkup(species, skin)` へ書き換え

- 各speciesのDOMは monster-mock.html の該当 `.slot` 内からコピー(`role="img"`ごと)
- ルート要素に `id="questMonster"` と `monster--idle` を付与
- 色替えはルートを `<div class="skin skin--teal">…</div>` で包む(skinなし=標準色)。**hue-rotateはラッパー側**なので状態アニメのfilterと干渉しない
- 旧 `.monster__hud` はDOMごと廃止(HP表示は11.5の`.foe-plate`へ)

### 11.4 抽選ロジック(新設 `pickNextFoe()`)

```js
const NORMAL_SPECIES = ["inky", "dust", "tome", "pncl"];
function pickNextFoe() {
  if ((state.defeatCount + 1) % 5 === 0) return { species: "dex", bars: 2 };      // 5体ごとにボス
  if (state.timeLeft <= 15 && Math.random() < 0.5) return { species: "clock", bars: 1 }; // 残り15秒でチクタク乱入
  const pool = NORMAL_SPECIES.filter(s => s !== state.lastSpecies);               // 直前と同種は出さない
  return { species: pool[Math.floor(Math.random() * pool.length)], bars: 1 };
}
```

`nextQuestion()` 内で呼び、`state.currentFoe = { species, bars, barsLeft, skin, level }` を保持。`state.lastSpecies` と `state.defeatCount` を追加する。

### 11.5 敵ネームプレート `.foe-plate`

DOM/CSSは `docs/game-mock.html` の `#foePlate` をコピー(バトルステージ直下・モンスターの上)。

- `#foeName`: 「インキー <b>Lv.3</b>」形式。種名は日本語表示名マップで(inky=インキー / dust=ケシカス / tome=レキシコン / pncl=カキカキ / clock=チクタク / dex=グランデックス)
- HPバー: `--hp` を `.game-root` に設定(`root.style.setProperty("--hp", pct)`)。チャンク1個配置ごとに減少
- `#foeBars`(●●)はボスのみ表示。1本目消費で1個目を `.on` から外す

### 11.6 レベルと色ティア

- Lv = `state.defeatCount + 1`(ゲーム内通算)。スコアは既存計算に `×(1 + 0.1×(Lv-1))` を掛けて四捨五入
- 色ティア: Lv1〜2 = skinなし / Lv3〜4 = 変異色 / Lv5〜 = レア色

| species | 変異色(Lv3〜4) | レア色(Lv5〜) |
|---|---|---|
| inky | `skin--teal` | `skin--amber` |
| dust | `skin--rose` | `skin--crimson` |
| tome | `skin--jade` | `skin--rose` |
| pncl | `skin--teal` | `skin--jade` |
| clock | `skin--teal` | `skin--crimson` |
| dex | なし(常に固有色) | なし |

(hue値の微調整はFableが後で行うため、クラス名だけ正しく付けること)

### 11.7 ボスのHP引き継ぎ(2問制)

- ダメージ=チャンク配置。**死亡判定は `completeQuestion()` 時のみ**(解答中にモンスターは入れ替わらない)
- HPバー表示: ボス1問目は 100%→50%、2問目は 50%→0% にスケールして減らす(通常種は 100%→0%)
- 1問目完了時: `barsLeft` を1減らし、`playMonsterOnce("hit")` の強調版(screen-shake併用可)を再生。**defeated/entranceは再生しない**(同一個体続投、HPと`#foeBars`表示は維持)
- 2問目完了時: 通常どおり defeated → 撃破カウント → 次個体 entrance
- 時間切れがボス戦中でも特別処理は不要(そのままゲームオーバー)

### 11.8 ボス登場演出

- ボス出現問の開始時のみ: `#bossStamp`(game-mock.htmlからDOM/CSSコピー、`#boss`状態で確認可)を表示して1.1s単発再生。個体は `.dex` の entrance(下からせり上がり+オーラ)
- **通常種には扉・シャッター等の遷移演出を入れない**(60秒に5〜8回発生するためテンポを削ぐ。登場は各種の entrance 750msで完結させる)

### 11.9 時間ボーナス

- チクタク撃破 +2秒 / ボス撃破 +5秒。既存の `STREAK_BONUS_SECONDS`(3コンボごと+3秒)と同じ加算経路を使うこと(タイマーは実時間デルタ方式なので、`roundStartedAt` はいじらない)
- 加算時はHUDのタイムバー付近に「+2s」ポップ(既存のstreakボーナス表示があればそれを流用)
