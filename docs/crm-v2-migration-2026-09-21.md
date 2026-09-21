# CRM V2 生产迁移记录

- 数据库：`cheuk-nang-reservations`
- Database ID：`37a6cd8c-aef1-4265-b259-24d51c885c88`
- 迁移：`0003_crm_operations.sql`
- 状态：成功
- Time Travel 回滚书签：`0000002f-00000000-000050ed-d08250c2f9021648b1b6578cc04df46f`
- 本地迁移演练：成功
- 生产迁移命令：`npx wrangler d1 migrations apply cheuk-nang-reservations --remote`

如需回滚，应先停止写入，再使用 Cloudflare D1 Time Travel 恢复到上述书签；恢复操作会覆盖书签之后的写入，必须另行确认。
