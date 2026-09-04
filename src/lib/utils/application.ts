import type { LocalEnumOption } from '$lib/enums';

/**
 * 将后端以整数分保存的金额转换为前端表单使用的元。
 *
 * 无法转换为有效数字时返回 0，避免编辑申请时出现 NaN。
 */
export function centsToYuan(value: unknown): number {
	const amount = Number(value);
	return Number.isFinite(amount) ? amount / 100 : 0;
}

/**
 * 将金额格式化为人民币展示文本，并固定保留两位小数。
 */
export function formatAmount(amount: number): string {
	return `¥${amount.toLocaleString('zh-CN', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})}`;
}

/**
 * 根据枚举 value 查找对应的 label。
 *
 * 找不到匹配项时返回原始 value，兼容后端返回暂未配置的枚举值。
 */
export function getEnumLabel<T extends LocalEnumOption>(
	options: readonly T[],
	value: string
): string {
	return options.find((option) => option.value === value)?.label ?? value;
}
