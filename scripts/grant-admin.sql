-- 把指定邮箱账户升级为 admin —— 用于调试/超级号
--
-- 原理：src/lib/billing/quota.ts:96-97 内置 admin 短路逻辑：
--   `if (role === USER_ROLES.ADMIN) return;`
-- 设了 admin 之后，checkQuota() 直接返回——
--   • 不查模型白名单 (allowedModelPatterns)
--   • 不查月度消息上限 (monthlyMsgLimit)
--   • 不查 token 上限 (monthlyTokenLimit)
-- 所以 admin 账户能用所有模型 + 无限调用，**无需伪造 subscription 行**。
--
-- 用法：
--   1) 先用普通注册流程在 /sign-up 注册账户（邮箱+密码）
--   2) 把下方 <YOUR_EMAIL_HERE> 替换为你注册时填的邮箱
--   3) 在 Sealos Database → siyuan-pg → 「连接」打开 psql/Adminer 粘贴执行
--   4) 浏览器刷新页面（不需要重登），下次发消息即可绕过配额

UPDATE "user"
SET role = 'admin'
WHERE email = '<YOUR_EMAIL_HERE>';

-- 验证：应输出 1 行 role=admin
SELECT id, email, role, created_at
FROM "user"
WHERE email = '<YOUR_EMAIL_HERE>';
