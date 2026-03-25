# Coding Standards

## 1. この規約の目的

この規約は、コードを短くするためではなく、
あとから読めるようにするためのもの。

このプロジェクトでは以下を重視する。

- 名前で意味がわかること
- 責務が分かれていること
- ロジックが追いやすいこと
- 将来の拡張で壊れにくいこと
- AI生成コードでも人間が理解できること

## 2. 基本原則

### 2.1 短さより明快さ
短い名前より、意味が明確な名前を選ぶ。

悪い例:
- data
- itemList2
- tmp
- calc

良い例:
- activeSession
- acquiredItems
- weeklyRankingScore
- calculateSessionScore

### 2.2 1ファイル1責務を意識する
1つのファイルに役割を詰め込みすぎない。

悪い例:
- 画面表示
- DB更新
- スコア計算
- アイテム抽選

これを1ファイルに全部入れること。

良い例:
- 画面は表示と操作
- 計算は lib
- DBアクセスは server
- 型は types

### 2.3 ロジックをUIに埋め込まない
画面コンポーネント内にスコア計算や抽選ロジックを直書きしない。
再利用できる関数として切り出す。

## 3. 命名規則

### 3.1 変数名
意味が明確な英語を使う。
省略しすぎない。

例:
- activeField
- sessionStartTime
- pauseAccumulatedSeconds
- effectiveMinutes

### 3.2 関数名
動詞から始める。
何を返すか、何をするかがわかる名前にする。

例:
- calculateEffectiveSeconds
- calculateSessionScore
- determineRewardRarity
- createSession
- endSession

### 3.3 boolean
真偽値は is / has / can / should で始める。

例:
- isPublic
- hasActiveSession
- canResumeSession
- shouldGrantReward

### 3.4 定数
意味のある単位でまとめる。
マジックナンバーを散らすな。

悪い例:
if (minutes > 120) { ... }

良い例:
const MAX_EFFECTIVE_MINUTES_FOR_FULL_REWARD = 120;

## 4. コメント方針

### 4.1 コメントは「なぜ」を書く
コードで読めることをわざわざ説明しない。

悪い例:
pauseAccumulatedSeconds += pausedDuration;
// pausedDuration を加算する

良い例:
pauseAccumulatedSeconds += pausedDuration;
// セッションの真実は時刻ベースで保持する。
// 再開時に休憩総量へ加算しておくことで、表示と保存の計算を単純化する。

### 4.2 コメントでごまかさない
コードが読みにくいなら、まず分割や命名を直す。
コメントで泥を塗り固めるな。

### 4.3 長い説明は関数へ逃がす
複雑な条件分岐は、説明コメントを増やす前に関数名へ意味を持たせる。

悪い例:
if (
  effectiveMinutes >= 45 &&
  effectiveMinutes <= 60 &&
  restMinutes >= 5 &&
  restMinutes <= 10
) { ... }

良い例:
if (isRecommendedFocusWindow(effectiveMinutes, restMinutes)) { ... }

## 5. 関数設計

### 5.1 1関数1目的
1つの関数で複数の意味を持たせない。

悪い例:
- セッション終了
- スコア計算
- DB保存
- 報酬抽選
- レベルアップ処理

を1つの関数でやる。

良い例:
- calculateEffectiveSeconds
- calculateSessionScore
- calculateGrantedXp
- determineReward
- persistEndedSession

### 5.2 入出力を明確にする
関数は何を受け取り、何を返すかが読みやすいこと。

### 5.3 副作用を閉じ込める
DB更新、日時取得、乱数生成などの副作用は境界側に寄せる。
純粋計算は lib に寄せる。

## 6. UI設計

### 6.1 UIは薄く保つ
画面コンポーネントの役割は以下に絞る。

- 表示
- ユーザー操作の受け取り
- 必要な関数呼び出し

### 6.2 表示用整形を分離する
秒を mm:ss に変えるなどの整形は util に寄せる。
画面の中で毎回書かない。

## 7. 状態管理

### 7.1 真実の状態を明確にする
セッションの真実は時刻情報。
フロントのカウント表示は真実ではない。

### 7.2 状態名を固定する
セッション状態は以下に限定する。

- idle
- working
- paused
- ended

増やす前に仕様との整合を確認する。

## 8. データアクセス

### 8.1 DBアクセスはまとめる
画面や計算関数から直接DB操作を乱発しない。
server 側に寄せる。

### 8.2 クエリと計算を混ぜすぎない
取得は取得、計算は計算で責務を分ける。

## 9. エラー処理

### 9.1 失敗パターンを握る
セッション終了時に active session がない、
paused でないのに再開しようとする、
などの状態破壊を防ぐ。

### 9.2 想定外を黙殺しない
握りつぶす catch は避ける。
何が失敗したか分かるようにする。

## 10. 拡張しやすさの方針

### 10.1 今ないものを前提にしない
将来ドット絵を入れる予定でも、今のコードに画像前提ロジックを埋め込まない。

### 10.2 theme で分岐しすぎない
最初はテーマ差分をテキストとアイテムプール程度にとどめる。
複雑な職業固有ロジックは後で拡張する。

### 10.3 先に抽象化しすぎない
まだ1種類しかない処理を無理に汎用化しない。
ただし、将来明らかに増える概念には名前をつけて分けておく。

## 11. AI生成コードの扱い

### 11.1 AIコードは必ず読む
生成されたから正しい、ではない。
差分を読む。
責務を確認する。
命名を見る。

### 11.2 1タスク1責務で生成させる
一気に全部作らせない。
小さく切る。

### 11.3 説明させる
変更したファイルごとに責務を説明させる。
読めないコードは採用しない。

## 12. コミット方針

### 12.1 小さく切る
意味のある単位でコミットする。

### 12.2 コミットメッセージを雑にしない
悪い例:
- fix
- update
- いろいろ
- 仮

良い例:
- feat: add session result view
- feat: implement session score calculation
- fix: prevent ending an already ended session
- docs: add initial coding standards

## 13. 最後の判断基準

このコードは、
未来の自分が見て追えるか。
責務が説明できるか。
あとからテーマ追加、アプリ化、演出追加をしても壊れにくいか。

そこに通らないなら、今は書き直したほうがいい。
短く書くより、読めるほうが強い。