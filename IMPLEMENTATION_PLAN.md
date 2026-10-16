# EventBridge イベント送信機能の実装計画

## 1. 目的

Grafana のアプリ画面から、繰り返し使う EventBridge イベントをテンプレートとして管理し、必要な値だけをフォームに入力して送信できるようにする。主な利用者は、EventBridge 経由でデータパイプラインや Lambda を起動する運用者を想定する。

## 2. リポジトリの現状

- `src/pages/PageOne.tsx` から `PageFour.tsx` は Grafana アプリのサンプルページ。
- `src/plugin.json` のナビゲーションも Page One〜Four のサンプル構成。
- バックエンドは `pkg/plugin/app.go` と `pkg/plugin/resources.go` にあり、`/ping` と `/echo` の例リソースを提供している。
- リポジトリ内の検索では AWS 認証や EventBridge 送信処理は確認できなかった。別ブランチなどに既存の認証実装がある場合はそれを再利用し、なければ AWS SDK for Go v2 の認証チェーンを使うところから着手する。
- Grafana のアプリ設定はテンプレート保存用の永続ストレージではない。現在の `provisioning/plugins/apps.yaml` とアプリ設定画面にはサンプルの API URL/API key が残っている。

## 3. 推奨する利用体験

### テンプレート一覧

アプリの最初のページをテンプレート一覧にする。テンプレート名、説明、タグ、リージョン、イベントバス、Source、Detail type を表示し、名前・タグ・送信先で検索／絞り込みできるようにする。各行から「実行」「編集」「複製」を選べるようにする。

### テンプレート実行

テンプレートを開くと、固定値と入力フォームを並べて表示する。フォームにはラベル、型、必須、初期値、選択肢を定義できる。入力値を EventBridge の `Detail` JSON に組み立て、送信前に送信先と完成したイベント JSON をプレビューできるようにする。任意の JSON を扱える「詳細 JSON 編集」は後続機能として追加する。

送信ボタンを押したら、送信先と入力値を確認するダイアログを表示する。送信結果は EventBridge の受付結果として示し、AWS が後続の Lambda やパイプライン処理まで完了したようには表示しない。

初期の権限は、Admin が AWS と保存先を設定し、Editor 以上がテンプレートを管理・実行し、Viewer は閲覧のみとする案を推奨する。実行権限はフロントのボタン表示だけに頼らず、バックエンドでも検証する。

### テンプレート作成・編集

テンプレートは基本項目、送信先、固定イベント項目、フォーム項目の順に編集する。入力項目は最初は string、number、boolean、select、JSON に絞る。複雑な JSON Schema 対応やイベントの一括送信は初期リリースに含めない。

## 4. データモデルと保存方針

テンプレートの最低限の項目は次の通り。

```json
{
  "id": "uuid",
  "name": "daily-pipeline",
  "description": "日次パイプラインを開始する",
  "tags": ["pipeline", "daily"],
  "target": {
    "region": "ap-northeast-1",
    "eventBusName": "operations"
  },
  "event": {
    "source": "company.pipeline",
    "detailType": "StartDailyPipeline",
    "fixedDetail": {"environment": "staging"},
    "fields": [
      {"key": "runDate", "label": "実行日", "type": "string", "required": true}
    ]
  },
  "version": 1
}
```

テンプレートは Grafana のバックエンドからのみ読み書きする。Grafana のアプリ設定 `jsonData` は管理者向け設定、`secureJsonData` は秘密情報向けであり、通常ユーザーが作成するテンプレートの保存先にはしない。

複数ユーザー・複数 Grafana インスタンスから共有する前提では、AWS 認証を再利用できる DynamoDB を永続ストアとして推奨する。`TemplateRepository` インターフェースを先に設け、org ID でデータを分離し、更新時はバージョンを使った楽観ロックを行う。保存先を後から差し替えやすくし、インメモリ実装はテスト専用にする。JSON のインポート／エクスポートも用意して、テンプレートの移行やバックアップを可能にする。

## 5. AWS 接続と送信の設計

- ブラウザーから AWS API を直接呼ばず、Grafana バックエンドのリソース API 経由で送信する。
- Grafana が AWS 上で動作する場合は、EKS IRSA、ECS task role、EC2 instance profile 等のワークロードロールを第一候補にする。別環境では AssumeRole 等を検討する。長期アクセスキーを使う必要がある場合だけ Grafana の `secureJsonData` で受け取り、ログや応答に出さない。
- IAM は対象 EventBridge バスへの `events:PutEvents` に限定する。テンプレート保存に DynamoDB を使う場合も、対象テーブルに必要な読み書き権限だけを追加する。
- リージョン、イベントバス、Source、Detail type、Detail をサーバー側で検証してから AWS SDK の `PutEvents` を呼ぶ。
- 初期版は1回の実行につき1イベントを送信し、EventBridge のイベントサイズ上限を超える payload を送信前に拒否する。
- EventBridge の応答は HTTP 成功だけで判断せず、`FailedEntryCount` と各エントリーの `ErrorCode` / `ErrorMessage` を確認して、全成功・一部失敗・全失敗を分けて返す。
- 送信リトライは自動で行わない。再送はイベントの重複起動につながる可能性があるため、結果を確認した利用者が明示的に行う。

## 6. バックエンド API の案

既存の `CallResourceHandler` に以下のリソースを追加する。すべて Grafana の認可コンテキストを検証し、入力 JSON のサイズ・形式を制限する。

| 操作 | 用途 |
| --- | --- |
| `GET /templates` | org 内テンプレート一覧 |
| `POST /templates` | テンプレート作成 |
| `GET /templates/{id}` | 詳細取得 |
| `PUT /templates/{id}` | 更新 |
| `DELETE /templates/{id}` | 削除 |
| `POST /templates/{id}/execute` | 入力値を検証し、PutEvents を実行 |

実行結果には EventBridge の `EventId`、受付状態、エラー情報を返す。`EventId` が返っても下流ターゲットの処理完了を意味しないことを UI に明記する。

## 7. 実装フェーズ

### Phase 0: 前提整理

- 実際に使う AWS 認証方式を確認し、既存実装があれば呼び出し方を特定する。
- テンプレートを Grafana org 内で共有するか、作成者ごとに分けるかを決める。推奨は org 共有。
- DynamoDB のテーブル名、リージョン、Grafana ロールごとの「閲覧・編集・実行」権限を決める。

### Phase 1: アプリの骨格

- 雛形の Page One〜Four を「Templates」「Executions」「Configuration」などの実画面に置き換える。
- 設定画面を EventBridge 用に整理し、リージョンやデフォルト送信先などの非秘密設定を `jsonData` に、必要な秘密情報だけ `secureJsonData` に保存する。
- `/ping`・`/echo` の例リソースを整理し、SDK の `CheckHealth` とテンプレート API の役割を明確にする。

### Phase 2: テンプレート管理

- テンプレート型、サーバー側バリデーション、`TemplateRepository` を実装する。
- DynamoDB 保存、org 単位の分離、更新競合の検出、一覧検索を追加する。
- 一覧、作成、編集、複製、削除と JSON インポート／エクスポートを実装する。

### Phase 3: フォーム生成とプレビュー

- テンプレートの `fields` 定義から Grafana UI のフォームを生成する。
- 必須・型・選択肢をフロントとバックエンドの両方で検証する。
- 固定値と入力値を合成し、完成した EventBridge エントリーを送信前にプレビューする。

### Phase 4: EventBridge 送信

- AWS SDK for Go v2 の EventBridge クライアントを追加する。
- `/templates/{id}/execute` を実装し、認証、認可、検証、PutEvents、部分失敗の応答をまとめる。
- 実行前確認、送信中状態、成功・部分失敗・失敗表示を追加する。

### Phase 5: 実行履歴と運用性

- 実行時刻、実行ユーザー、テンプレート ID／バージョン、送信先、EventId、結果を記録する。
- イベント Detail 全文はデフォルトでは履歴に保存しない。機密値を含む場合の漏えいを避ける。
- 履歴一覧と失敗理由の確認を追加する。下流処理の成否が必要なら、将来 CloudWatch メトリクスや Step Functions 等の実行状態と連携する。

### Phase 6: 品質確認と配布

- Go の単体テストでテンプレート検証、Detail の生成、PutEvents の成功・部分失敗を確認する。
- フロントエンドテストでフォーム生成、入力検証、プレビュー、結果表示を確認する。
- 既存の `@grafana/plugin-e2e` を使い、テンプレート作成から送信結果表示までの主要フローを検証する。
- Grafana のバージョン要件、IAM ポリシー例、AWS 側の事前準備、テンプレート JSON 形式を README に記載する。

## 8. 初期リリースの完了条件

1. 利用者がテンプレートを作成・編集・複製・削除できる。
2. テンプレートごとに EventBridge のリージョン、イベントバス、Source、Detail type、固定 Detail、入力項目を管理できる。
3. 実行画面で入力フォームと最終 JSON を確認してから送信できる。
4. AWS 認証情報をブラウザーへ渡さず、サーバー側 IAM 権限で PutEvents できる。
5. EventBridge の部分失敗を含む応答を正しく表示し、意図しない自動再送をしない。
6. テンプレートが Grafana 再起動や画面再読み込み後も保持され、org 間で混ざらない。

## 9. Grafana 固有の注意

ナビゲーション変更で `src/plugin.json` を編集する場合、Grafana サーバーの再起動が必要になる。プラグイン ID と type は変更しない。
