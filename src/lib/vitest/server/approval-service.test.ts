import { describe, expect, it, vi } from 'vitest';
import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';
import {
	approveApplication,
	batchApproveApplications,
	cancelApplication,
	rejectApplication,
	type ApprovalDb
} from '$lib/server/approval-service';

const manager = { id: 'manager-1', name: '经理', role: USER_ROLE.manager };
const finance = { id: 'finance-1', name: '财务', role: USER_ROLE.finance };

function createDb(
	application: Record<string, unknown>,
	actor: { id: string; name: string; role: string } = manager
): ApprovalDb {
	const transactionDb = {
		application: {
			findMany: vi.fn().mockResolvedValue([application]),
			update: vi.fn().mockResolvedValue({})
		}
	};

	return {
		user: {
			findUnique: vi.fn().mockResolvedValue(actor)
		},
		application: {
			findUnique: vi.fn().mockResolvedValue(application),
			findMany: vi.fn().mockResolvedValue([application]),
			update: vi.fn().mockResolvedValue({})
		},
		$transaction: vi.fn(async (callback) => callback(transactionDb))
	} as unknown as ApprovalDb;
}

function pendingManagerApplication() {
	return {
		id: 'TR-0001',
		applicantId: 'employee-1',
		status: APPLICATION_STATUS.pendingManager,
		applicant: { managerId: 'manager-1' }
	};
}

describe('approval-service', () => {
	it('经理通过直属下属申请后进入财务审批', async () => {
		const db = createDb(pendingManagerApplication());

		const status = await approveApplication(
			{ actorId: manager.id, applicationId: 'TR-0001' },
			db
		);

		expect(status).toBe(APPLICATION_STATUS.pendingFinance);
		expect(db.application.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'TR-0001' },
				data: expect.objectContaining({
					status: APPLICATION_STATUS.pendingFinance
				})
			})
		);
	});

	it('驳回时必须填写理由，并记录理由', async () => {
		const db = createDb(pendingManagerApplication());

		await expect(
			rejectApplication(
				{ actorId: manager.id, applicationId: 'TR-0001', reason: '   ' },
				db
			)
		).rejects.toMatchObject({ status: 400 });

		await rejectApplication(
			{ actorId: manager.id, applicationId: 'TR-0001', reason: '行程安排不完整' },
			db
		);

		expect(db.application.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: APPLICATION_STATUS.rejected,
					auditLogs: expect.objectContaining({
						create: expect.objectContaining({
							comment: '行程安排不完整'
						})
					})
				})
			})
		);
	});

	it('财务通过待财务审批申请后进入已通过', async () => {
		const application = {
			...pendingManagerApplication(),
			status: APPLICATION_STATUS.pendingFinance
		};
		const db = createDb(application, finance);

		await approveApplication({ actorId: finance.id, applicationId: application.id }, db);

		expect(db.application.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: APPLICATION_STATUS.approved })
			})
		);
	});

	it('不能审批不属于自己权限范围的申请', async () => {
		const application = {
			...pendingManagerApplication(),
			applicant: { managerId: 'other-manager' }
		};
		const db = createDb(application, manager);

		await expect(
			approveApplication({ actorId: manager.id, applicationId: application.id }, db)
		).rejects.toMatchObject({ status: 403 });
		expect(db.application.update).not.toHaveBeenCalled();
	});

	it('批量通过会在事务中更新所有申请', async () => {
		const applications = [
			pendingManagerApplication(),
			{
				...pendingManagerApplication(),
				id: 'TR-0002'
			}
		];
		const db = createDb(applications[0], manager);
		const transactionUpdate = vi.fn().mockResolvedValue({});
		const transactionFindMany = vi.fn().mockResolvedValue(applications);
		(db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
			callback({
				application: { findMany: transactionFindMany, update: transactionUpdate }
			})
		);

		const count = await batchApproveApplications(
			{ actorId: manager.id, applicationIds: ['TR-0001', 'TR-0002'] },
			db
		);

		expect(count).toBe(2);
		expect(transactionFindMany).toHaveBeenCalled();
		expect(transactionUpdate).toHaveBeenCalledTimes(2);
	});

	it('申请人可以撤销待审批申请', async () => {
		const application = {
			id: 'TR-0001',
			applicantId: 'employee-1',
			status: APPLICATION_STATUS.pendingManager
		};
		const db = createDb(application, { id: 'employee-1', name: '张三', role: USER_ROLE.employee });

		await cancelApplication({ actorId: 'employee-1', applicationId: application.id }, db);

		expect(db.application.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: APPLICATION_STATUS.cancelled })
			})
		);
	});
});
