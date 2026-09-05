/**
 * 仅包含展示层会用到的申请字段。
 */
export type ApplicationFields = {
	reason?: string;
	legs?: Array<{ from?: string; to?: string }>;
	budget?: Record<string, number | undefined>;
};

type ApplicationLike = {
	fields: unknown;
};

/**
 * 从申请对象中取出已知的展示字段。
 */
export function applicationFieldsOf(application: ApplicationLike): ApplicationFields {
	return application.fields as ApplicationFields;
}

/**
 * 将申请行程拼成「A → B → C」的展示文案。
 */
export function applicationRouteOf(application: ApplicationLike): string {
	const cities: string[] = [];

	for (const leg of applicationFieldsOf(application).legs ?? []) {
		const from = leg.from?.trim();
		const to = leg.to?.trim();

		if (from && cities[cities.length - 1] !== from) cities.push(from);
		if (to && cities[cities.length - 1] !== to) cities.push(to);
	}

	return cities.length > 0 ? cities.join(' → ') : '-';
}

/**
 * 计算申请的预算合计，返回单位为分的整数。
 */
export function applicationBudgetTotalOf(application: ApplicationLike): number {
	const budget = applicationFieldsOf(application).budget ?? {};
	return Object.values(budget).reduce<number>((sum, value) => sum + (Number(value) || 0), 0);
}

/**
 * 提取可搜索文本，供列表筛选使用。
 */
export function applicationSearchTextOf(application: ApplicationLike): string {
	const fields = applicationFieldsOf(application);
	const destinations = (fields.legs ?? [])
		.flatMap((leg) => [leg.from, leg.to])
		.filter(Boolean)
		.join(' ');

	return `${fields.reason ?? ''} ${destinations}`.toLowerCase();
}
