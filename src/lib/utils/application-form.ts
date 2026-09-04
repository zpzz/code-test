import { APPLICATION_STATUS, TRANSPORT, URGENCY, USER_ROLE } from '$lib/enums';

/**
 * 页面提交的行程字段。
 *
 * 这些字段来自 JSON 字符串，属性都保持可选，方便处理草稿和历史数据。
 */
export type DraftLeg = {
	id?: string;
	from?: string;
	to?: string;
	departDate?: string;
	returnDate?: string;
	transport?: string;
};

/**
 * 页面提交的申请字段。
 */
export type DraftFields = {
	reason?: string;
	urgency?: string;
	legs?: DraftLeg[];
	budget?: Record<string, unknown>;
	budgetNote?: string;
};

/**
 * 服务端持久化前使用的标准化预算结构，单位为分。
 */
export type NormalizedBudget = {
	transport: number;
	hotel: number;
	allowance: number;
	other: number;
};

/**
 * 服务端持久化前使用的标准化申请字段。
 */
export type NormalizedFields = {
	reason: string;
	urgency: typeof URGENCY.normal | typeof URGENCY.urgent;
	legs: Array<{
		id: string;
		from: string;
		to: string;
		departDate: string;
		returnDate: string;
		transport: string;
	}>;
	budget: NormalizedBudget;
	budgetNote: string;
};

const transportValues = new Set(Object.values(TRANSPORT));

/**
 * 从 FormData 中读取页面序列化的申请字段。
 *
 * JSON 格式错误或字段不是字符串时返回 null，由 action 统一返回参数错误。
 */
export function readApplicationFields(value: FormDataEntryValue | null): DraftFields | null {
	if (typeof value !== 'string') return null;

	try {
		const fields = JSON.parse(value) as DraftFields;
		return fields && typeof fields === 'object' ? fields : null;
	} catch {
		return null;
	}
}

/**
 * 将页面输入的元转换为数据库保存的整数分。
 *
 * 非法金额和负数统一按 0 处理，并四舍五入避免浮点数直接入库。
 */
export function yuanToCents(value: unknown): number {
	const amount = Number(value);
	return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
}

/**
 * 清理并补齐申请字段，保证数据库收到稳定的数据结构。
 */
export function normalizeApplicationFields(fields: DraftFields): NormalizedFields {
	const budget = fields.budget ?? {};

	return {
		reason: String(fields.reason ?? '').trim(),
		urgency: fields.urgency === URGENCY.urgent ? URGENCY.urgent : URGENCY.normal,
		legs: (fields.legs ?? []).slice(0, 10).map((leg, index) => ({
			id: leg.id || `leg-${index + 1}`,
			from: String(leg.from ?? '').trim(),
			to: String(leg.to ?? '').trim(),
			departDate: String(leg.departDate ?? ''),
			returnDate: String(leg.returnDate ?? ''),
			transport: transportValues.has(String(leg.transport))
				? String(leg.transport)
				: TRANSPORT.train
		})),
		budget: {
			transport: yuanToCents(budget.transport),
			hotel: yuanToCents(budget.hotel),
			allowance: yuanToCents(budget.allowance),
			other: yuanToCents(budget.other)
		},
		budgetNote: String(fields.budgetNote ?? '').trim()
	};
}

/**
 * 校验正式提交的申请。
 *
 * 保存草稿不要求通过这些校验，只有提交 action 会调用此方法。
 */
export function validateApplicationForSubmit(fields: NormalizedFields): string | null {
	if (fields.reason.length < 10 || fields.reason.length > 200) {
		return '出差事由请填写 10 至 200 个字';
	}

	if (fields.legs.length === 0) return '请至少添加一段行程';

	for (const leg of fields.legs) {
		if (!leg.from || !leg.to || !leg.departDate || !leg.returnDate) {
			return '请完善每段行程的出发地、目的地和日期';
		}
		if (leg.from === leg.to) return '出发地与目的地不能相同';
		if (leg.returnDate < leg.departDate) return '返回日期不能早于出发日期';
	}

	const total = Object.values(fields.budget).reduce((sum, amount) => sum + amount, 0);
	if (total <= 0) return '预算合计需大于 0';
	if (total > 1_000_000 && !fields.budgetNote) return '预算超过 10,000 元，请填写预算说明';

	return null;
}

/**
 * 根据申请人的角色计算提交后的审批状态。
 *
 * 经理跳过主管审批，直接进入财务审批。
 */
export function getNextSubmitStatus(role: string) {
	return role === USER_ROLE.manager
		? APPLICATION_STATUS.pendingFinance
		: APPLICATION_STATUS.pendingManager;
}
