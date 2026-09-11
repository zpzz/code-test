/** 时间口径：库里存本地墙钟字面量（…Z）。写入用 localNow()，读取用 getUTC* 还原，不做时区换算。 */

/** YYYY-MM-DD，无效返回 '-'。 */
export function formatDate(value: string | Date | null | undefined): string {
	if (!value) return '-';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';

	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** YYYY-MM-DD HH:mm，无效返回 '-'。 */
export function formatDateTime(value: string | Date | null | undefined): string {
	if (!value) return '-';

	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '-';

	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
		d.getUTCHours()
	)}:${pad(d.getUTCMinutes())}`;
}

/** YYYY-MM，无效返回 '-'。 */
export function formatYearMonth(value: string | Date | null | undefined): string {
	if (!value) return '-';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';

	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/** 本地墙钟拼成 …Z 字面量，如 2026-08-09T16:25:53.296Z。seed 数据不调用。 */
export function toLocalISO(now: Date = new Date()): string {
	const pad = (n: number, len = 2) => String(n).padStart(len, '0');
	return (
		`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
		`T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.` +
		`${pad(now.getMilliseconds(), 3)}Z`
	);
}

/** 返回可直接写入 Prisma 的本地墙钟 Date。写 createdAt / submittedAt / auditLogs.at 时用它。 */
export function localNow(now: Date = new Date()): Date {
	return new Date(toLocalISO(now));
}
