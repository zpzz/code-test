import { leaveTypeOptions, transportOptions, urgencyOptions } from '$lib/enums';

export type ApplicationType = 'travel' | 'leave';
export const APPLICATION_TYPE_VALUES: readonly ApplicationType[] = ['travel', 'leave'];

export type FieldOption = { label: string; value: string };

export type FieldDef =
	| {
			kind: 'text' | 'textarea';
			key: string;
			label: string;
			required?: boolean;
			minLength?: number;
			maxLength?: number;
			placeholder?: string;
			hint?: string;
	  }
	| {
			kind: 'number';
			key: string;
			label: string;
			required?: boolean;
			money?: boolean;
			min?: number;
			placeholder?: string;
			hint?: string;
	  }
	| {
			kind: 'select' | 'radio';
			key: string;
			label: string;
			required?: boolean;
			options: readonly FieldOption[];
	  }
	| { kind: 'date'; key: string; label: string; required?: boolean }
	| {
			kind: 'dateRange';
			key: string;
			label: string;
			required?: boolean;
			fromKey: string;
			toKey: string;
	  }
	| {
			kind: 'repeatable';
			key: string;
			label: string;
			itemKey: string;
			itemFields: FieldDef[];
			min?: number;
			max?: number;
			addLabel?: string;
	  }
	| { kind: 'group'; key: string; label: string; fields: FieldDef[] };

export type StepDef = {
	slug: string;
	title: string;
	description: string;
	kind: 'form' | 'preview';
	fields: FieldDef[];
};

export type ApplicationTypeDef = {
	type: ApplicationType;
	label: string;
	mark: string;
	idPrefix: string;
	steps: StepDef[];
	typeRefine?: (fields: Record<string, unknown>) => string | null;
};

const travelOptions: readonly FieldOption[] = transportOptions;
const urgencyFieldOptions: readonly FieldOption[] = urgencyOptions;
const leaveOptions: readonly FieldOption[] = leaveTypeOptions;

function checkBudgetTotal(fields: Record<string, unknown>): string | null {
	const budget = (fields.budget ?? {}) as Record<string, unknown>;
	const total = ['transport', 'hotel', 'allowance', 'other'].reduce(
		(sum, key) => sum + Number(budget[key] ?? 0),
		0
	);

	if (total <= 0) return '预算合计需大于 0';
	if (total > 10000 && !String(fields.budgetNote ?? '').trim()) {
		return '预算超过 10,000 元，请填写预算说明';
	}

	return null;
}

export const APPLICATION_TYPES: Record<ApplicationType, ApplicationTypeDef> = {
	travel: {
		type: 'travel',
		label: '差旅申请',
		mark: '差',
		idPrefix: 'TR',
		typeRefine: checkBudgetTotal,
		steps: [
			{
				slug: 'basic',
				title: '基本信息',
				description: '出差事由与紧急程度',
				kind: 'form',
				fields: [
					{
						kind: 'textarea',
						key: 'reason',
						label: '出差事由',
						required: true,
						minLength: 10,
						maxLength: 200,
						placeholder: '请说明出差背景、目的与大致安排'
					},
					{ kind: 'radio', key: 'urgency', label: '紧急程度', required: true, options: urgencyFieldOptions }
				]
			},
			{
				slug: 'trips',
				title: '行程明细',
				description: '出发地、目的地与日期',
				kind: 'form',
				fields: [
					{
						kind: 'repeatable',
						key: 'legs',
						label: '行程明细',
						itemKey: 'id',
						min: 1,
						max: 10,
						addLabel: '添加行程段',
						itemFields: [
							{ kind: 'text', key: 'from', label: '出发地', required: true, maxLength: 30 },
							{ kind: 'text', key: 'to', label: '目的地', required: true, maxLength: 30 },
							{ kind: 'date', key: 'departDate', label: '出发日期', required: true },
							{ kind: 'date', key: 'returnDate', label: '返回日期', required: true },
							{ kind: 'select', key: 'transport', label: '交通方式', required: true, options: travelOptions }
						]
					}
				]
			},
			{
				slug: 'budget',
				title: '费用预算',
				description: '分项预算与说明',
				kind: 'form',
				fields: [
					{
						kind: 'group',
						key: 'budget',
						label: '分项预算',
						fields: [
							{ kind: 'number', key: 'transport', label: '交通费', required: true, money: true },
							{ kind: 'number', key: 'hotel', label: '住宿费', required: true, money: true },
							{ kind: 'number', key: 'allowance', label: '补贴', required: true, money: true },
							{ kind: 'number', key: 'other', label: '其他', required: true, money: true }
						]
					},
					{
						kind: 'textarea',
						key: 'budgetNote',
						label: '预算说明',
						maxLength: 200,
						hint: '预算超过 10,000 元时需填写说明'
					}
				]
			},
			{ slug: 'preview', title: '预览确认', description: '核对信息后提交', kind: 'preview', fields: [] }
		]
	},
	leave: {
		type: 'leave',
		label: '请假申请',
		mark: '请',
		idPrefix: 'LV',
		steps: [
			{
				slug: 'basic',
				title: '基本信息',
				description: '请假事由与类型',
				kind: 'form',
				fields: [
					{ kind: 'textarea', key: 'reason', label: '请假事由', required: true, minLength: 5, maxLength: 200 },
					{ kind: 'select', key: 'leaveType', label: '请假类型', required: true, options: leaveOptions }
				]
			},
			{
				slug: 'detail',
				title: '请假时间',
				description: '起止日期与备注',
				kind: 'form',
				fields: [
					{ kind: 'dateRange', key: 'leaveRange', label: '请假时间', required: true, fromKey: 'leaveStart', toKey: 'leaveEnd' },
					{ kind: 'textarea', key: 'note', label: '备注', maxLength: 200 }
				]
			},
			{ slug: 'preview', title: '预览确认', description: '核对信息后提交', kind: 'preview', fields: [] }
		]
	}
};

export function getApplicationType(type: string): ApplicationTypeDef {
	return APPLICATION_TYPES[APPLICATION_TYPE_VALUES.includes(type as ApplicationType) ? (type as ApplicationType) : 'travel'];
}

export function isApplicationType(type: string): type is ApplicationType {
	return APPLICATION_TYPE_VALUES.includes(type as ApplicationType);
}

export function firstStep(type: ApplicationType): string {
	return APPLICATION_TYPES[type].steps[0].slug;
}

export function stepBySlug(type: ApplicationType, slug: string): StepDef {
	return APPLICATION_TYPES[type].steps.find((step) => step.slug === slug) ?? APPLICATION_TYPES[type].steps[0];
}
