import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';

/** 审批动作：通过 / 驳回。 */
export type ApprovalAction = 'approve' | 'reject';

/** 参与审批的人，只需要 id 与 role 即可判定权限。 */
export interface ApprovalActor {
	id: string;
	role: string;
}

/** 可被审批的申请：状态机只依赖这三个字段，调用方传 Prisma 结果即可（结构类型兼容）。 */
export interface ApprovableApplication {
	applicantId: string;
	status: string;
	applicant: { managerId: string | null };
}

/** 状态机输出：目标状态 + 实际执行的动作。 */
export interface ApprovalTransition {
	toStatus: string;
	action: ApprovalAction;
}

/** 是否具备审批人身份（经理 / 财务）。 */
export function isApprovalRole(role: string): boolean {
	return role === USER_ROLE.manager || role === USER_ROLE.finance;
}

/**
 * 审批状态机唯一入口。
 *
 * - 经理：只能处理直属下属的 pending_manager，approve → pending_finance，reject → rejected。
 * - 财务：处理所有 pending_finance（不能审自己的），approve → approved，reject → rejected。
 * - 不满足返回 null，调用方统一按“无权限 / 已被处理”回 403。
 */
export function resolveApprovalTransition(
	actor: ApprovalActor,
	application: ApprovableApplication,
	action: ApprovalAction
): ApprovalTransition | null {
	if (
		actor.role === USER_ROLE.manager &&
		application.status === APPLICATION_STATUS.pendingManager &&
		application.applicantId !== actor.id &&
		application.applicant.managerId === actor.id
	) {
		return {
			toStatus:
				action === 'approve' ? APPLICATION_STATUS.pendingFinance : APPLICATION_STATUS.rejected,
			action
		};
	}

	if (
		actor.role === USER_ROLE.finance &&
		application.status === APPLICATION_STATUS.pendingFinance &&
		application.applicantId !== actor.id
	) {
		return {
			toStatus: action === 'approve' ? APPLICATION_STATUS.approved : APPLICATION_STATUS.rejected,
			action
		};
	}

	return null;
}

/** 驳回理由校验：1 至 200 字。合法返回 null。 */
export function validateRejectReason(reason: string): string | null {
	const text = reason.trim();
	if (!text || text.length > 200) return '请填写 1 至 200 字的驳回理由。';
	return null;
}

/** 撤销只允许处于待审批流转中的申请。 */
export function isCancellableStatus(status: string): boolean {
	return (
		status === APPLICATION_STATUS.pendingManager || status === APPLICATION_STATUS.pendingFinance
	);
}

/** 只有申请人可撤销处于待审批流转中的申请。 */
export function canCancel(
	actorId: string,
	application: { applicantId: string; status: string }
): boolean {
	return application.applicantId === actorId && isCancellableStatus(application.status);
}
