/**
 * 本地静态枚举。
 *
 * 所有枚举项统一只保留 label/value，展示样式等配置放在 EnumService 中处理。
 */
export interface LocalEnumOption<T extends string = string> {
	readonly label: string;
	readonly value: T;
}

export const applicationStatusOptions = [
	{ label: '草稿', value: 'draft' },
	{ label: '待主管审批', value: 'pending_manager' },
	{ label: '待财务审批', value: 'pending_finance' },
	{ label: '已通过', value: 'approved' },
	{ label: '已驳回', value: 'rejected' },
	{ label: '已撤销', value: 'cancelled' }
] as const satisfies readonly LocalEnumOption[];

export const applicationStatusColorOptions = [
	{ label: 'draft', value: '#64748b' },
	{ label: 'pending_manager', value: '#f59e0b' },
	{ label: 'pending_finance', value: '#0ea5e9' },
	{ label: 'approved', value: '#059669' },
	{ label: 'rejected', value: '#e11d48' },
	{ label: 'cancelled', value: '#94a3b8' }
] as const satisfies readonly LocalEnumOption[];

export const applicationStatusClassOptions = [
	{
		label: 'draft',
		value: 'inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'
	},
	{
		label: 'pending_manager',
		value: 'inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700'
	},
	{
		label: 'pending_finance',
		value: 'inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700'
	},
	{
		label: 'approved',
		value: 'inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
	},
	{
		label: 'rejected',
		value: 'inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700'
	},
	{
		label: 'cancelled',
		value: 'inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'
	}
] as const satisfies readonly LocalEnumOption[];

export const roleOptions = [
	{ label: '员工', value: 'employee' },
	{ label: '经理', value: 'manager' },
	{ label: '财务', value: 'finance' }
] as const satisfies readonly LocalEnumOption[];

export const urgencyOptions = [
	{ label: '普通', value: 'normal' },
	{ label: '紧急', value: 'urgent' }
] as const satisfies readonly LocalEnumOption[];

export const transportOptions = [
	{ label: '高铁/火车', value: 'train' },
	{ label: '飞机', value: 'flight' },
	{ label: '自驾/汽车', value: 'car' },
	{ label: '其他', value: 'other' }
] as const satisfies readonly LocalEnumOption[];

export const localEnum = {
	applicationStatus: applicationStatusOptions,
	applicationStatusColor: applicationStatusColorOptions,
	applicationStatusClass: applicationStatusClassOptions,
	role: roleOptions,
	urgency: urgencyOptions,
	transport: transportOptions
} as const;

export const APPLICATION_STATUS = {
	draft: 'draft',
	pendingManager: 'pending_manager',
	pendingFinance: 'pending_finance',
	approved: 'approved',
	rejected: 'rejected',
	cancelled: 'cancelled'
} as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

export const USER_ROLE = {
	employee: 'employee',
	manager: 'manager',
	finance: 'finance'
} as const;

export type UserRoleValue = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const URGENCY = {
	normal: 'normal',
	urgent: 'urgent'
} as const;

export type UrgencyValue = (typeof URGENCY)[keyof typeof URGENCY];

export const TRANSPORT = {
	train: 'train',
	flight: 'flight',
	car: 'car',
	other: 'other'
} as const;

export type TransportValue = (typeof TRANSPORT)[keyof typeof TRANSPORT];
