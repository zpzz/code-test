import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatYearMonth, localNow, toLocalISO } from '$lib/format/date';

describe('format/date 时间策略', () => {
	it('toLocalISO 把本地墙钟拼成 Z 字面量', () => {
		// 构造一个本地时区的固定时刻，避免依赖机器时区也能断言分量对应关系
		const local = new Date(2026, 7, 9, 16, 25, 53, 296);
		expect(toLocalISO(local)).toBe('2026-08-09T16:25:53.296Z');
	});

	it('localNow 写入后经 getUTC* 读回仍是本地墙钟（东八区下不早 8 小时）', () => {
		const local = new Date(2026, 7, 9, 16, 25, 53, 0);
		const stored = localNow(local);

		expect(formatDateTime(stored)).toBe('2026-08-09 16:25');
		expect(formatDate(stored)).toBe('2026-08-09');
		expect(formatYearMonth(stored)).toBe('2026-08');
	});

	it('空值与非法值统一返回占位符', () => {
		expect(formatDate(null)).toBe('-');
		expect(formatDateTime(undefined)).toBe('-');
		expect(formatYearMonth('not-a-date')).toBe('-');
	});
});
