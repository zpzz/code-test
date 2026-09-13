import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';
import {
	saveApplication,
	type ApplicationDb
} from '$lib/server/application-service';

const applicant = {
	id: 'employee-1',
	name: '张三',
	department: '研发部',
	role: USER_ROLE.employee
};

const travelFields = {
	reason: '客户现场交付支持',
	urgency: 'normal',
	legs: [
		{
			id: 'leg-1',
			from: '上海',
			to: '北京',
			departDate: '2026-09-20',
			returnDate: '2026-09-22',
			transport: 'train'
		}
	],
	budget: {
		transport: 500,
		hotel: 800,
		allowance: 300,
		other: 0
	},
	budgetNote: ''
};

function createDb(overrides: Record<string, unknown> = {}): ApplicationDb {
	return {
		user: {
			findUnique: vi.fn().mockResolvedValue(applicant)
		},
		application: {
			findFirst: vi.fn().mockResolvedValue(null),
			findUnique: vi.fn().mockResolvedValue(null),
			create: vi.fn().mockResolvedValue({}),
			update: vi.fn().mockResolvedValue({})
		},
		...overrides
	} as unknown as ApplicationDb;
}

describe('application-service', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('可以创建差旅草稿，并保持草稿状态', async () => {
		const db = createDb();

		const result = await saveApplication(
			{
				type: 'travel',
				applicantId: applicant.id,
				rawFields: travelFields,
				intent: 'save'
			},
			db,
			() => new Date('2026-09-13T10:00:00.000Z')
		);

		expect(result).toEqual({ applicationId: 'TR-0001', status: APPLICATION_STATUS.draft });
		expect(db.application.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					id: 'TR-0001',
					type: 'travel',
					status: APPLICATION_STATUS.draft,
					submittedAt: null
				})
			})
		);
	});

	it('提交请假申请时会流转到主管审批', async () => {
		const db = createDb();
		const leaveFields = {
			reason: '家中有事需要请假',
			leaveType: 'personal',
			leaveRange: {
				leaveStart: '2026-09-20',
				leaveEnd: '2026-09-21'
			},
			note: ''
		};

		const result = await saveApplication(
			{
				type: 'leave',
				applicantId: applicant.id,
				rawFields: leaveFields,
				intent: 'submit'
			},
			db,
			() => new Date('2026-09-13T10:00:00.000Z')
		);

		expect(result.status).toBe(APPLICATION_STATUS.pendingManager);
		expect(db.application.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					type: 'leave',
					status: APPLICATION_STATUS.pendingManager,
					submittedAt: expect.any(Date),
					auditLogs: expect.objectContaining({
						create: expect.objectContaining({
							action: 'submit',
							toStatus: APPLICATION_STATUS.pendingManager
						})
					})
				})
			})
		);
	});

	it('请假申请缺少日期时不能提交', async () => {
		const db = createDb();

		await expect(
			saveApplication(
				{
					type: 'leave',
					applicantId: applicant.id,
					rawFields: {
						reason: '家中有事需要请假',
						leaveType: 'personal',
						leaveRange: {}
					},
					intent: 'submit'
				},
				db
			)
		).rejects.toMatchObject({
			message: '请填写完整的请假时间',
			status: 400
		});
		expect(db.application.create).not.toHaveBeenCalled();
	});

	it('可以编辑自己的草稿，但不能编辑审批中的申请', async () => {
		const db = createDb({
			application: {
				findFirst: vi.fn().mockResolvedValue(null),
				findUnique: vi.fn().mockResolvedValue({
					id: 'TR-0009',
					type: 'travel',
					applicantId: applicant.id,
					status: APPLICATION_STATUS.draft,
					submittedAt: null
				}),
				create: vi.fn(),
				update: vi.fn().mockResolvedValue({})
			}
		});

		const result = await saveApplication(
			{
				type: 'travel',
				applicantId: applicant.id,
				editId: 'TR-0009',
				rawFields: travelFields,
				intent: 'save'
			},
			db
		);

		expect(result).toEqual({ applicationId: 'TR-0009', status: APPLICATION_STATUS.draft });
		expect(db.application.update).toHaveBeenCalled();

		(db.application.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: 'TR-0009',
			type: 'travel',
			applicantId: applicant.id,
			status: APPLICATION_STATUS.pendingManager,
			submittedAt: new Date()
		});

		await expect(
			saveApplication(
				{
					type: 'travel',
					applicantId: applicant.id,
					editId: 'TR-0009',
					rawFields: travelFields,
					intent: 'save'
				},
				db
			)
		).rejects.toMatchObject({ status: 403 });
	});

	it('不能使用其他申请人的身份编辑申请', async () => {
		const db = createDb({
			application: {
				findFirst: vi.fn().mockResolvedValue(null),
				findUnique: vi.fn().mockResolvedValue({
					id: 'TR-0009',
					type: 'travel',
					applicantId: 'another-user',
					status: APPLICATION_STATUS.draft
				}),
				create: vi.fn(),
				update: vi.fn()
			}
		});

		await expect(
			saveApplication(
				{
					type: 'travel',
					applicantId: applicant.id,
					editId: 'TR-0009',
					rawFields: travelFields,
					intent: 'save'
				},
				db
			)
		).rejects.toMatchObject({ status: 403 });
	});
});
