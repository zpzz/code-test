import { enumService } from '$lib/enums';

/**
 * 仅包含展示层会用到的申请字段。
 */
export type ApplicationFields = {
	reason?: string;
	legs?: Array<{ from?: string; to?: string }>;
	budget?: Record<string, number | undefined>;
	leaveType?: string;
	leaveStart?: string;
	leaveEnd?: string;
	leaveRange?: { leaveStart?: string; leaveEnd?: string };
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
 * 返回请假申请的日期范围。
 */
export function applicationLeaveRangeOf(application: ApplicationLike): string {
	const fields = applicationFieldsOf(application);
	const start = fields.leaveRange?.leaveStart ?? fields.leaveStart;
	const end = fields.leaveRange?.leaveEnd ?? fields.leaveEnd;

	return start && end ? `${start} 至 ${end}` : start || end || '-';
}

/**
 * 返回请假类型。
 */
export function applicationLeaveTypeOf(application: ApplicationLike): string {
	const leaveType = applicationFieldsOf(application).leaveType;
	return leaveType ? enumService.label('leaveType', leaveType) : '-';
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

	return `${fields.reason ?? ''} ${destinations} ${applicationLeaveRangeOf(application)} ${fields.leaveType ?? ''}`.toLowerCase();
}
