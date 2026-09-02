export const applicationStatuses = [
	'draft',
	'submitted',
	'reviewing',
	'approved',
	'rejected',
	'completed'
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const travelTypes = ['domestic', 'international'] as const;
export type TravelType = (typeof travelTypes)[number];

export const transportModes = ['plane', 'train', 'car', 'businessVehicle', 'other'] as const;
export type TransportMode = (typeof transportModes)[number];

export interface Option<T extends string = string> {
	value: T;
	label: string;
}

export const departmentOptions: Option[] = [
	{ value: '市场部', label: '市场部' },
	{ value: '销售部', label: '销售部' },
	{ value: '产品部', label: '产品部' },
	{ value: '研发部', label: '研发部' },
	{ value: '运营部', label: '运营部' },
	{ value: '财务部', label: '财务部' },
	{ value: '人力资源部', label: '人力资源部' }
];

export const travelTypeOptions: Option<TravelType>[] = [
	{ value: 'domestic', label: '国内差旅' },
	{ value: 'international', label: '国际差旅' }
];

export const transportOptions: Option<TransportMode>[] = [
	{ value: 'plane', label: '飞机' },
	{ value: 'train', label: '高铁 / 火车' },
	{ value: 'car', label: '自驾 / 打车' },
	{ value: 'businessVehicle', label: '公务车' },
	{ value: 'other', label: '其他' }
];

export const statusMeta: Record<
	ApplicationStatus,
	{ label: string; tone: string; color: string; description: string }
> = {
	draft: {
		label: '草稿',
		tone: 'slate',
		color: '#64748b',
		description: '待补充或再次编辑'
	},
	submitted: {
		label: '已提交',
		tone: 'sky',
		color: '#0284c7',
		description: '等待进入审核流'
	},
	reviewing: {
		label: '审核中',
		tone: 'amber',
		color: '#d97706',
		description: '审批人正在处理中'
	},
	approved: {
		label: '已批准',
		tone: 'emerald',
		color: '#059669',
		description: '已通过审批'
	},
	rejected: {
		label: '已驳回',
		tone: 'rose',
		color: '#e11d48',
		description: '需要修改后重新提交'
	},
	completed: {
		label: '已完成',
		tone: 'indigo',
		color: '#4f46e5',
		description: '流程已结束'
	}
};

export const transportLabels: Record<TransportMode, string> = {
	plane: '飞机',
	train: '高铁 / 火车',
	car: '自驾 / 打车',
	businessVehicle: '公务车',
	other: '其他'
};

export const travelTypeLabels: Record<TravelType, string> = {
	domestic: '国内差旅',
	international: '国际差旅'
};

export interface ApplicationDraft {
	applicantName: string;
	employeeId: string;
	department: string;
	position: string;
	approver: string;
	phone: string;
	destination: string;
	travelType: TravelType;
	startDate: string;
	endDate: string;
	purpose: string;
	budget: number;
	transport: TransportMode;
	accommodationNeeded: boolean;
	companionCount: number;
	remark: string;
}

export interface ApplicationHistoryEntry {
	status: ApplicationStatus;
	at: string;
	actor: string;
	note?: string;
}

export interface TravelApplication extends ApplicationDraft {
	id: string;
	code: string;
	status: ApplicationStatus;
	createdAt: string;
	updatedAt: string;
	submittedAt: string;
	history: ApplicationHistoryEntry[];
}

export interface ApplicationFilters {
	query: string;
	status: ApplicationStatus | 'all';
}

export interface StatusBreakdownItem {
	status: ApplicationStatus;
	label: string;
	count: number;
	share: number;
	color: string;
}

export interface DepartmentBreakdownItem {
	department: string;
	count: number;
}

export interface ApplicationStatistics {
	total: number;
	totalBudget: number;
	averageBudget: number;
	approvedRate: number;
	pendingCount: number;
	statusBreakdown: StatusBreakdownItem[];
	departmentBreakdown: DepartmentBreakdownItem[];
}

export interface DraftErrors {
	applicantName?: string;
	employeeId?: string;
	department?: string;
	position?: string;
	approver?: string;
	phone?: string;
	destination?: string;
	startDate?: string;
	endDate?: string;
	purpose?: string;
	budget?: string;
	transport?: string;
	companionCount?: string;
}

export interface WorkflowAction {
	status: ApplicationStatus;
	label: string;
	intent: 'primary' | 'secondary' | 'danger';
	note?: string;
}

const workflowActionMap: Record<ApplicationStatus, WorkflowAction[]> = {
	draft: [{ status: 'submitted', label: '提交申请', intent: 'primary' }],
	submitted: [{ status: 'reviewing', label: '进入审核', intent: 'primary' }],
	reviewing: [
		{ status: 'approved', label: '批准通过', intent: 'primary' },
		{ status: 'rejected', label: '驳回申请', intent: 'danger' }
	],
	approved: [{ status: 'completed', label: '标记完成', intent: 'secondary' }],
	rejected: [{ status: 'submitted', label: '重新提交', intent: 'primary' }],
	completed: []
};

export function getWorkflowActions(status: ApplicationStatus): WorkflowAction[] {
	return workflowActionMap[status];
}

export function createEmptyDraft(): ApplicationDraft {
	return {
		applicantName: '',
		employeeId: '',
		department: departmentOptions[0]?.value ?? '',
		position: '',
		approver: '',
		phone: '',
		destination: '',
		travelType: 'domestic',
		startDate: '',
		endDate: '',
		purpose: '',
		budget: 0,
		transport: 'plane',
		accommodationNeeded: true,
		companionCount: 0,
		remark: ''
	};
}

export function normalizeDraft(draft: ApplicationDraft): ApplicationDraft {
	return {
		...draft,
		applicantName: draft.applicantName.trim(),
		employeeId: draft.employeeId.trim(),
		department: draft.department.trim(),
		position: draft.position.trim(),
		approver: draft.approver.trim(),
		phone: draft.phone.trim(),
		destination: draft.destination.trim(),
		startDate: draft.startDate.trim(),
		endDate: draft.endDate.trim(),
		purpose: draft.purpose.trim(),
		remark: draft.remark.trim(),
		budget: Number.isFinite(draft.budget) ? Number(draft.budget) : 0,
		companionCount: Number.isFinite(draft.companionCount) ? Number(draft.companionCount) : 0
	};
}

export function validateApplicationDraft(draft: ApplicationDraft): DraftErrors {
	const errors: DraftErrors = {};
	const normalized = normalizeDraft(draft);

	if (!normalized.applicantName) errors.applicantName = '请输入申请人姓名';
	if (!normalized.employeeId) errors.employeeId = '请输入工号';
	if (!normalized.department) errors.department = '请选择部门';
	if (!normalized.position) errors.position = '请输入岗位';
	if (!normalized.approver) errors.approver = '请输入审批人';
	if (!normalized.phone) {
		errors.phone = '请输入手机号';
	} else if (!/^1\d{10}$/.test(normalized.phone)) {
		errors.phone = '手机号格式不正确';
	}
	if (!normalized.destination) errors.destination = '请输入目的地';
	if (!normalized.startDate) errors.startDate = '请选择出发日期';
	if (!normalized.endDate) errors.endDate = '请选择返回日期';
	if (normalized.startDate && normalized.endDate && normalized.endDate < normalized.startDate) {
		errors.endDate = '返回日期不能早于出发日期';
	}
	if (!normalized.purpose) errors.purpose = '请输入差旅事由';
	if (!normalized.budget || normalized.budget <= 0) errors.budget = '请输入大于 0 的预算';
	if (normalized.companionCount < 0) errors.companionCount = '同行人数不能为负数';

	return errors;
}

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('zh-CN', {
		style: 'currency',
		currency: 'CNY',
		maximumFractionDigits: 0
	}).format(value);
}

export function formatPercent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

export function formatShortDate(value: string): string {
	if (!value) return '-';
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'short',
		day: '2-digit'
	}).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(value));
}

export function formatDateRange(startDate: string, endDate: string): string {
	if (!startDate && !endDate) return '-';
	return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}
