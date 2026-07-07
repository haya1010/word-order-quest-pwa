# Word Order Quest

ブラウザだけで動く英語語順学習ゲームです。

## 起動方法

`index.html` を直接開いてもfallback教材で動きます。
外部JSON教材を確実に読み込むには、ローカルサーバーで開いてください。

```bash
python3 -m http.server
```

その後、ブラウザで以下を開きます。

```text
http://localhost:8000/
```

## PWAとして確認する

PWAのService Workerは `file://` では動きません。
インストールやオフライン動作を確認する場合は、上記のローカルサーバーで開いてください。

Chromeなどで `http://localhost:8000/` を開くと、条件を満たした環境ではブラウザのインストールメニューからホーム画面/アプリとして追加できます。
教材JSONは初回アクセス時にキャッシュされ、以後はオフラインでも開ける構成です。

## 教材追加

1. `data/lessons/.../*.json` にlesson JSONを追加
2. `data/courses.json` の該当コースに `lessonPath` を追加
3. HTMLやゲームロジックは変更不要

AIに教材JSONを生成させるプロンプトは `docs/lesson-json-prompt.md` にあります。
