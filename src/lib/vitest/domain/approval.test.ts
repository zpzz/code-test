import { describe, expect, it } from 'vitest';
import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';
import {
	canCancel,
	isApprovalRole,
	resolveApprovalTransition,
	validateRejectReason
} from '$lib/domain/approval';

const manager = { id: 'manager-1', role: USER_ROLE.manager };
const finance = { id: 'finance-1', role: USER_ROLE.finance };
const employee = { id: 'employee-1', role: USER_ROLE.employee };

function pendingManagerApp() {
	return {
		applicantId: 'employee-1',
		status: APPLICATION_STATUS.pendingManager,
		applicant: { managerId: 'manager-1' }
	};
}

describe('approval 状态机', () => {
	it('经理审批直属下属的 pending_manager：通过进财务，驳回结束', () => {
		expect(resolveApprovalTransition(manager, pendingManagerApp(), 'approve')).toEqual({
			toStatus: APPLICATION_STATUS.pendingFinance,
			action: 'approve'
		});
		expect(resolveApprovalTransition(manager, pendingManagerApp(), 'reject')).toEqual({
			toStatus: APPLICATION_STATUS.rejected,
			action: 'reject'
		});
	});

	it('经理不能审非直属、不能审自己、不能审 pending_finance', () => {
		expect(
			resolveApprovalTransition(
				manager,
				{ ...pendingManagerApp(), applicant: { managerId: 'other-manager' } },
				'approve'
			)
		).toBeNull();
		expect(
			resolveApprovalTransition(
				{ id: 'employee-1', role: USER_ROLE.manager },
				pendingManagerApp(),
				'approve'
			)
		).toBeNull();
		expect(
			resolveApprovalTransition(
				manager,
				{ ...pendingManagerApp(), status: APPLICATION_STATUS.pendingFinance },
				'approve'
			)
		).toBeNull();
	});

	it('财务审批所有 pending_finance：通过结束，驳回结束；不能审自己', () => {
		const app = { ...pendingManagerApp(), status: APPLICATION_STATUS.pendingFinance };
		expect(resolveApprovalTransition(finance, app, 'approve')).toEqual({
			toStatus: APPLICATION_STATUS.approved,
			action: 'approve'
		});
		expect(resolveApprovalTransition(finance, app, 'reject')).toEqual({
			toStatus: APPLICATION_STATUS.rejected,
			action: 'reject'
		});
		expect(
			resolveApprovalTransition(
				{ id: 'employee-1', role: USER_ROLE.finance },
				{ ...app, applicantId: 'employee-1' },
				'approve'
			)
		).toBeNull();
	});

	it('员工无审批权限，错误状态返回 null', () => {
		expect(resolveApprovalTransition(employee, pendingManagerApp(), 'approve')).toBeNull();
		expect(
			resolveApprovalTransition(manager, { ...pendingManagerApp(), status: 'draft' }, 'approve')
		).toBeNull();
		expect(isApprovalRole(USER_ROLE.employee)).toBe(false);
		expect(isApprovalRole(USER_ROLE.manager)).toBe(true);
	});

	it('驳回理由 1 至 200 字', () => {
		expect(validateRejectReason('')).not.toBeNull();
		expect(validateRejectReason('   ')).not.toBeNull();
		expect(validateRejectReason('x'.repeat(201))).not.toBeNull();
		expect(validateRejectReason('理由充分')).toBeNull();
	});

	it('只有申请人可撤销待审批中的申请', () => {
		expect(
			canCancel('employee-1', {
				applicantId: 'employee-1',
				status: APPLICATION_STATUS.pendingManager
			})
		).toBe(true);
		expect(
			canCancel('other', { applicantId: 'employee-1', status: APPLICATION_STATUS.pendingManager })
		).toBe(false);
		expect(
			canCancel('employee-1', { applicantId: 'employee-1', status: APPLICATION_STATUS.approved })
		).toBe(false);
	});
});
