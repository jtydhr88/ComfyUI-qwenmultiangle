# ComfyUI-qwenmultiangle

**Language / 语言 / 言語 / 언어:** [English](README.md) | [中文](README_zh.md) | [日本語](README_ja.md) | [한국어](README_ko.md)

3Dカメラアングル制御用のComfyUIカスタムノード。インタラクティブなThree.jsビューポートでカメラアングルを調整し、マルチアングル画像生成用のフォーマット済みプロンプト文字列を出力します。
![img.png](img.png)
## 機能

- **インタラクティブな3Dカメラ制御** - Three.jsビューポートでハンドルをドラッグして調整：
  - 水平角度（アジマス）：0° - 360°
  - 垂直角度（エレベーション）：-30°から60°
  - ズームレベル：0 - 10
- **クイック選択ドロップダウン** - プリセットカメラアングルを素早く選択するための3つのドロップダウンメニュー：
  - アジマス：正面、クォータービュー、サイドビュー、背面
  - エレベーション：ローアングル、アイレベル、ハイアングル、俯瞰
  - 距離：ワイドショット、ミディアムショット、クローズアップ
- **リアルタイムプレビュー** - 画像入力を接続すると、正確なカラーレンダリングでカードとして3Dシーンに表示
- **カメラビューモード** - `camera_view`を切り替えてカメラインジケーターの視点からシーンをプレビュー、インタラクティブなオービット制御対応（ドラッグで回転、スクロールでズーム）
- **プロンプト出力** - [Qwen-Image-Edit-2511-Multiple-Angles-LoRA](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA)と互換性のあるフォーマット済みプロンプトを出力
- **双方向同期** - スライダーウィジェット、3Dハンドル、ドロップダウンが同期を維持
- **多言語サポート** - UIラベルは英語、中国語、日本語、韓国語で利用可能（ComfyUI設定から自動検出）
- **カメラプロンプト翻訳** - オプションのコンパニオンノード（**Qwen Multiangle Camera Translate**）がカメラ用語を中国語・日本語・韓国語に翻訳し、英語以外のベースプロンプトと一致させます

## インストール

1. ComfyUIカスタムノードフォルダに移動：
   ```bash
   cd ComfyUI/custom_nodes
   ```

2. このリポジトリをクローン：
   ```bash
   git clone https://github.com/jtydhr88/ComfyUI-qwenmultiangle.git
   ```

3. ComfyUIを再起動

4. https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/tree/main からLoRAをダウンロードしてloraフォルダに配置

## 開発

このプロジェクトはフロントエンドの構築にVue 3、TypeScript、Viteを使用しています。3DビューポートはThree.jsで構築されています。バックエンドはComfyUI V3ノードAPIを使用しています。

### 前提条件

- Node.js 18+
- npm

### ビルド

```bash
# 依存関係をインストール
npm install

# 本番用ビルド
npm run build

# ウォッチモードでビルド（開発用）
npm run dev

# 型チェック
npm run typecheck
```

### プロジェクト構造

```
ComfyUI-qwenmultiangle/
├── src/
│   ├── main.ts                        # エクステンションエントリーポイント（Vueアプリマウント）
│   ├── App.vue                        # ルートVueコンポーネント
│   ├── CameraWidget.ts               # ヘッドレスThree.jsカメラ制御エンジン
│   ├── i18n.ts                        # 国際化 (en/zh/ja/ko)
│   ├── types.ts                       # TypeScript型定義
│   ├── components/
│   │   ├── SceneCanvas.vue            # Three.jsキャンバスコンテナ
│   │   └── ControlPanel.vue           # ドロップダウンコントロールと値表示
│   └── composables/
│       └── useCameraWidget.ts         # リアクティブステートブリッジ（Vue ↔ Three.js）
├── js/                                # ビルド出力（配布用にコミット済み）
│   ├── main.js
│   └── assets/
│       └── main.css
├── nodes.py                           # ComfyUI V3ノード定義
├── __init__.py                        # Pythonモジュール初期化
├── package.json
├── tsconfig.json
└── vite.config.mts
```

## 使用方法

1. `image/multiangle`カテゴリから**Qwen Multiangle Camera**ノードを追加
2. オプション：3Dシーンでプレビューするために画像入力を接続
3. 以下の方法でカメラアングルを調整：
   - 3Dビューポートでカラーハンドルをドラッグ
   - スライダーウィジェットを使用
   - ドロップダウンメニューからプリセット値を選択
4. `camera_view`を切り替えてカメラの視点からプレビューを確認
5. ノードはカメラアングルを説明するプロンプト文字列を出力

### ウィジェット

| ウィジェット | タイプ | 説明 |
|-------------|--------|------|
| horizontal_angle | スライダー | カメラアジマス角度 (0° - 360°) |
| vertical_angle | スライダー | カメラエレベーション角度 (-30°から60°) |
| zoom | スライダー | カメラ距離/ズームレベル (0 - 10) |
| default_prompts | チェックボックス | **非推奨** - 後方互換性のためのみ保持、効果なし |
| camera_view | チェックボックス | カメラの視点からシーンをプレビュー |

### 3Dビューポート制御

| ハンドル | 色 | 制御 |
|----------|-----|------|
| リングハンドル | ピンク | 水平角度（アジマス） |
| アークハンドル | シアン | 垂直角度（エレベーション） |
| ラインハンドル | ゴールド | ズーム/距離 |

画像プレビューはカードとして表示されます - 正面は画像を表示し、背面から見るとグリッドパターンが表示されます。

### カメラビューモード制御

`camera_view`が有効な場合、マウスでカメラをインタラクティブに制御できます：

| アクション | 制御 |
|------------|------|
| 左右ドラッグ | 水平回転（アジマス） |
| 上下ドラッグ | 垂直回転（エレベーション） |
| 上スクロール | ズームイン（距離増加） |
| 下スクロール | ズームアウト（距離減少） |

すべての操作はスライダーと同じ制限を遵守します：
- アジマス：0° - 360°（ループ）
- エレベーション：-30°から60°
- 距離：0 - 10

オービット制御による変更は自動的にスライダーウィジェットと同期されます。

### クイック選択ドロップダウン

3Dビューポートには、プリセットカメラアングルを素早く選択するための3つのドロップダウンメニューがあります：

| ドロップダウン | オプション |
|---------------|-----------|
| 水平 (H) | 正面、右前方、右側面、右後方、背面、左後方、左側面、左前方 |
| 垂直 (V) | ローアングル、アイレベル、ハイアングル、俯瞰 |
| 距離 (Z) | ワイドショット、ミディアムショット、クローズアップ |

プリセットを選択すると、3Dハンドルとスライダーウィジェットが自動的に更新されます。

### 国際化

UIラベルはComfyUIの言語設定に基づいて自動的に翻訳されます：

| 言語 | コード |
|------|--------|
| 英語 | en |
| 中国語（簡体字） | zh |
| 日本語 | ja |
| 韓国語 | ko |

UI言語に関係なく、出力プロンプトは常に英語です。

### 出力プロンプト形式

ノードは[Qwen-Image-Edit-2511-Multiple-Angles-LoRA](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA)が必要とする形式でプロンプトを出力します：

```
<sks> {アジマス} {エレベーション} {距離}
```

例：
- `<sks> front view eye-level shot medium shot`
- `<sks> right side view high-angle shot close-up`
- `<sks> back-left quarter view low-angle shot wide shot`

#### サポートされる値

| パラメータ | 値 |
|-----------|-----|
| アジマス | `front view`、`front-right quarter view`、`right side view`、`back-right quarter view`、`back view`、`back-left quarter view`、`left side view`、`front-left quarter view` |
| エレベーション | `low-angle shot` (-30°)、`eye-level shot` (0°)、`elevated shot` (30°)、`high-angle shot` (60°) |
| 距離 | `close-up`、`medium shot`、`wide shot` |

## カメラプロンプト翻訳ノード

カメラノードは常に用語を**英語**で出力します。ベースプロンプトが他の言語（例えば中国語）で書かれている場合、英語のカメラ用語を追加するとカメラ効果が弱まったり、完全に機能しなくなったりすることがあります。モデルは周囲の言語と一致しない指示を無視する傾向があるためです。

**Qwen Multiangle Camera Translate** ノードはこれを解決します。プロンプト文字列を受け取り、手動でメンテナンスされた用語集を使って、カメラ／ショット用語*のみ*を対象言語に翻訳します。それ以外の部分——ベースプロンプト、`<sks>` トークン、句読点——はそのまま通過します。

これは意図的に**独立した**ノードです。元のカメラノードは変更されていないため、既存のワークフローはこれまでと同じように動作します。必要なときだけ翻訳ノードを追加してください。

### 使用方法

1. `image/multiangle` カテゴリから **Qwen Multiangle Camera Translate** ノードを追加します
2. **Qwen Multiangle Camera** の `prompt` 出力をその `prompt` 入力に接続します（またはテキストを直接貼り付けます）
3. **ターゲット言語**を選択します
4. 翻訳された出力をテキストエンコーダーに渡します

一般的な接続：`Qwen Multiangle Camera → Qwen Multiangle Camera Translate → CLIP Text Encode`

### 入力 / 出力

| ポート | タイプ | 説明 |
|--------|--------|------|
| prompt（入力） | String | カメラ用語を含むプロンプト（カメラノードから接続、またはテキストを貼り付け） |
| target_language | ドロップダウン | カメラ用語のターゲット言語 |
| prompt（出力） | String | カメラ用語が翻訳されたプロンプト |

### ターゲット言語

このREADMEが提供する言語と一致します：

| オプション | 動作 |
|-----------|------|
| 中文 (Chinese) | カメラ用語を中国語に翻訳 |
| 日本語 (Japanese) | カメラ用語を日本語に翻訳 |
| 한국어 (Korean) | カメラ用語を韓国語に翻訳 |
| English | パススルー（変更なし） |

用語集に存在するフレーズのみが翻訳されます。認識されない単語はそのまま通過します。用語集は `camera_glossary.py` にあり、`src/i18n.ts` のUI翻訳と同期されているため、手動での拡張や編集が簡単です。

### 例

同じカメラ姿勢（`front view` / `eye-level shot` / `medium shot`）を各ターゲット言語で出力した場合：

| ターゲット | 出力 |
|-----------|------|
| English | `<sks> front view eye-level shot medium shot` |
| 中文 | `<sks> 正面视角 平视 中景` |
| 日本語 | `<sks> 正面 アイレベル ミディアムショット` |
| 한국어 | `<sks> 정면 아이 레벨 미디엄 샷` |

## クレジット

### オリジナル実装

このComfyUIノードは[qwenmultiangle](https://github.com/amrrs/qwenmultiangle)（スタンドアロンのカメラアングル制御Webアプリケーション）をベースにしています。

オリジナルプロジェクトは以下からインスピレーションを受けています：
- Hugging Face Spacesの[multimodalart/qwen-image-multiple-angles-3d-camera](https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera)
- [fal.ai - Qwen Image Edit 2511 Multiple Angles](https://fal.ai/models/fal-ai/qwen-image-edit-2511-multiple-angles/)

## 関連プロジェクト

- [ComfyUI-qwenmultiangle-plus](https://github.com/cjlang2020/ComfyUI-qwenmultiangle-plus) - このプロジェクトをベースにした別の改良版

## ライセンス

MIT
