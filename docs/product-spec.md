# Product Spec

## 1. 概要

このアプリは、作業セッションを収集と成長に変換するWebアプリである。
ユーザーは用途ごとの作業フィールドを作成し、
各フィールドに対して作業を開始、休憩、再開、終了できる。
終了時には、作業の質に応じて経験値と報酬を獲得する。
報酬は図鑑に蓄積され、経験値は全体レベルに反映される。

## 2. プロダクトの狙い

- 作業開始の心理的ハードルを下げる
- 作業を「ただの時間記録」ではなく「進行と収集」に変える
- 長時間耐久ではなく、効率の良い集中リズムを褒める
- 将来のデスクトップアプリ化に耐えられる構造で作る

## 3. コア概念

### 3.1 ユーザー
アカウント本体。
総経験値、総レベル、総作業時間を持つ。

### 3.2 用途フィールド
ユーザーが自分で名前を付ける作業箱。
例:
- AWS
- 簿記
- Java
- 転職活動

各フィールドは以下を持つ。
- name
- theme
- is_public
- total_effective_seconds
- total_sessions

theme は職業テーマを表す。
例:
- miner
- fisher
- collector

### 3.3 セッション
作業の実行単位。
開始、休憩、再開、終了を持つ。

### 3.4 アイテム
セッション終了時に得られる報酬。
最初は文字情報のみ。
画像は後で追加する。

## 4. MVPで必要な機能

### 4.1 ログイン
- ユーザー登録またはログインができること
- 詳細な認証方式は実装時に選ぶ
- MVPでは一般的なWeb認証方式でよい

### 4.2 用途フィールド作成
- ユーザーは複数の用途フィールドを作成できる
- 各フィールドに name, theme, is_public を設定できる

### 4.3 用途フィールド一覧
- 自分の用途フィールド一覧を確認できる
- 各フィールドの累計時間を確認できる
- 各フィールドからセッションを開始できる

### 4.4 セッション開始
- フィールドを選んで作業開始できる
- working 状態に入る
- started_at を保存する

### 4.5 休憩
- 作業中に休憩へ移行できる
- paused 状態に入る
- paused_at を保存する

### 4.6 再開
- 休憩中から作業に戻れる
- 再開時に休憩時間を pause_accumulated_seconds に加算する
- working 状態に戻る
- paused_at を解除する

### 4.7 終了
- 作業中または休憩中に終了できる
- ended_at を保存する
- effective_seconds を計算する
- スコアと経験値を計算する
- アイテム抽選を行う

### 4.8 結果表示
- 今回の有効作業時間
- 今回のスコア
- 今回の経験値
- 今回獲得したアイテム
- レベルアップ有無
- 次レベルまでの残量

### 4.9 図鑑
- 獲得済みアイテムを一覧表示する
- 未獲得アイテムは隠してよい
- 用途フィールド単位で見られるようにしてもよい

### 4.10 近傍ランキング
- 週次スコアを使う
- 前後2人ずつだけ表示する
- 総時間ランキングにはしない

## 5. MVPで今はやらないこと

- ドット絵
- アニメーション
- ストーリー演出
- 通知
- フレンド
- チャット
- SNS共有
- 全体ランキング
- 高度な不正検知
- デスクトップ常駐機能

## 6. 状態遷移

セッション状態は以下に限定する。

- idle
- working
- paused
- ended

許可する遷移:
- idle -> working
- working -> paused
- paused -> working
- working -> ended
- paused -> ended

## 7. セッション計算ルール

セッションの真実の状態は時刻ベースで持つ。
フロントの秒表示は表示用にすぎない。

必要な項目:
- started_at
- paused_at
- ended_at
- pause_accumulated_seconds

effective_seconds は以下の考え方で計算する。
effective_seconds = ended_at - started_at - pause_accumulated_seconds

## 8. スコア設計

このアプリは長時間耐久を褒めない。
推奨帯を褒める。

### 8.1 セッション倍率の初期案

- 10分未満: 0.0
- 10〜24分: 0.6
- 25〜44分: 0.9
- 45〜60分: 1.15
- 61〜90分: 1.0
- 91〜120分: 0.75
- 121分以上: 0.35

### 8.2 休憩倍率の初期案

- 0〜4分: 0.95
- 5〜10分: 1.05
- 11〜20分: 1.0
- 21分以上: 0.9

### 8.3 スコア計算

score = effective_minutes × session_multiplier × rest_multiplier

XPは最初は単純に以下でよい。
xp = floor(score)

## 9. 報酬設計

最初は3段階でよい。
- common
- rare
- epic

高レアの出やすさはスコアに応じて変動させる。
時間だけでなく、効率の良い区切りに報酬が寄るようにする。

## 10. ランキング方針

- 総時間を競わせない
- 週次スコアを使う
- ユーザーの近傍だけ見せる
- 表示人数は前2人、後ろ2人、自分を含めて5人

## 11. 公開設定

用途フィールドごとに is_public を持つ。
MVPではこの単位で公開・非公開を制御する。

## 12. データモデルの初期案

### users
- id
- name
- email
- password_hash or auth_provider_id
- total_xp
- total_level
- created_at
- updated_at

### fields
- id
- user_id
- name
- theme
- is_public
- total_effective_seconds
- total_sessions
- created_at
- updated_at

### sessions
- id
- user_id
- field_id
- status
- started_at
- paused_at
- ended_at
- pause_accumulated_seconds
- effective_seconds
- score
- xp_gained
- reward_roll_seed
- created_at
- updated_at

### items
- id
- theme
- name
- rarity
- description
- unlock_level
- created_at

### user_items
- id
- user_id
- field_id
- item_id
- session_id
- acquired_at

### weekly_rankings
- id
- user_id
- week_start
- score
- bucket
- rank
- created_at

## 13. 画面一覧

### ログイン画面
- ログイン
- 新規登録

### ホーム画面
- 総レベル
- 総経験値
- 用途フィールド一覧
- 各フィールドの累計時間
- 各フィールドの開始ボタン
- 近傍ランキング

### フィールド詳細画面
- フィールド名
- テーマ
- 公開設定
- 累計時間
- 図鑑進捗
- 開始ボタン

### 作業中画面
- 現在のフィールド
- 経過時間
- 休憩
- 終了

### 結果画面
- 有効作業時間
- スコア
- XP
- 獲得アイテム
- レベルアップ有無

### 図鑑画面
- 獲得済みアイテム一覧
- 未獲得枠

## 14. 将来拡張の前提

- デスクトップアプリ化
- ドット絵追加
- 職業テーマ追加
- 通知
- 不正対策強化
- 公開プロフィール
- ストーリー要素

ただし今は実装しない。
骨格を壊さない形で拡張できるようにしておく。