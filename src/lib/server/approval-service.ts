import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { APPLICATION_STATUS } from '$lib/enums';
import { localNow } from '$lib/format/date';
import {
	canCancel,
	isApprovalRole,
	resolveApprovalTransition,
	validateRejectReason,
	type ApprovalAction
} from '$lib/domain/approval';
import { prisma } from './db';
import { ServiceError } from './service-error';

export type ApprovalDb = Pick<PrismaClient, 'user' | 'application'> & {
	$transaction: <T>(callback: (tx: ApprovalDb) => Promise<T>) => Promise<T>;
};

// PrismaClient 的 transaction 重载比 service 所需接口更复杂，这里只在默认实例处做一次类型适配。
const defaultApprovalDb = prisma as unknown as ApprovalDb;

/** 单条审批操作的基础参数。 */
type ApprovalInput = {
	actorId: string;
	applicationId: string;
};

/** 驳回申请时附带的驳回理由。 */
export type RejectApplicationInput = ApprovalInput & {
	reason: string;
};

/** 批量通过申请时使用的参数。 */
export type BatchApproveInput = {
	actorId: string;
	applicationIds: string[];
};

/**
 * 执行单条通过或驳回操作。
 *
 * 具体的角色、状态和上下级关系判断交给 approval.ts 状态机，
 * 本函数只负责查询数据、落库状态和创建审批日志。
 */
async function processApproval(
	input: ApprovalInput,
	action: ApprovalAction,
	rejectReason = '',
	db: ApprovalDb = defaultApprovalDb
): Promise<string> {
	if (action === 'reject') {
		// 驳回必须先校验理由，避免产生没有业务说明的驳回记录。
		const message = validateRejectReason(rejectReason);
		if (message) throw new ServiceError(message, 400);
	}

	const [actor, application] = await Promise.all([
		db.user.findUnique({
			where: { id: input.actorId },
			select: { id: true, name: true, role: true }
		}),
		db.application.findUnique({
			where: { id: input.applicationId },
			include: { applicant: { select: { managerId: true } } }
		})
	]);

	if (!actor || !isApprovalRole(actor.role)) {
		throw new ServiceError('当前用户没有审批权限。', 403);
	}
	if (!application) throw new ServiceError('未找到该申请。', 404);

	const transition = resolveApprovalTransition(actor, application, action);
	if (!transition) throw new ServiceError('当前角色没有处理这份申请的权限。', 403);

	const now = localNow();
	// 状态变更和审批日志通过同一次 update 写入，保证记录关联一致。
	await db.application.update({
		where: { id: application.id },
		data: {
			status: transition.toStatus,
			auditLogs: {
				create: {
					id: randomUUID(),
					at: now,
					actorId: actor.id,
					actorName: actor.name,
					action,
					fromStatus: application.status,
					toStatus: transition.toStatus,
					comment: action === 'reject' ? rejectReason : null
				}
			}
		}
	});

	return transition.toStatus;
}

/** 通过单条申请，并返回流转后的状态。 */
export function approveApplication(input: ApprovalInput, db: ApprovalDb = defaultApprovalDb): Promise<string> {
	return processApproval(input, 'approve', '', db);
}

/** 驳回单条申请，并返回流转后的状态。 */
export function rejectApplication(
	input: RejectApplicationInput,
	db: ApprovalDb = defaultApprovalDb
): Promise<string> {
	return processApproval(input, 'reject', input.reason, db);
}

/**
 * 在事务中批量通过申请。
 *
 * 只要有一条申请不存在或当前审批人无权处理，整个批量操作都会失败，
 * 避免出现部分成功、部分失败的结果。
 */
export async function batchApproveApplications(
	input: BatchApproveInput,
	db: ApprovalDb = defaultApprovalDb
): Promise<number> {
	const applicationIds = [...new Set(input.applicationIds)];
	if (applicationIds.length === 0) throw new ServiceError('请选择需要审批的申请。', 400);

	const actor = await db.user.findUnique({
		where: { id: input.actorId },
		select: { id: true, name: true, role: true }
	});
	if (!actor || !isApprovalRole(actor.role)) {
		throw new ServiceError('当前用户没有审批权限。', 403);
	}

	await db.$transaction(async (tx) => {
		const applications = await tx.application.findMany({
			where: { id: { in: applicationIds } },
			include: { applicant: { select: { managerId: true } } }
		});

		if (applications.length !== applicationIds.length) {
			throw new ServiceError('部分申请不存在或已被删除。', 400);
		}

		const transitions = applications.map((application) => ({
			application,
			transition: resolveApprovalTransition(actor, application, 'approve')
		}));
		if (transitions.some(({ transition }) => !transition)) {
			throw new ServiceError('部分申请已被处理，或你没有对应的审批权限。', 403);
		}

		const now = localNow();
		// 所有申请校验通过后才开始逐条更新，事务失败会整体回滚。
		for (const { application, transition } of transitions) {
			if (!transition) continue;
			await tx.application.update({
				where: { id: application.id },
				data: {
					status: transition.toStatus,
					auditLogs: {
						create: {
							id: randomUUID(),
							at: now,
							actorId: actor.id,
							actorName: actor.name,
							action: 'approve',
							fromStatus: application.status,
							toStatus: transition.toStatus,
							comment: null
						}
					}
				}
			});
		}
	});

	return applicationIds.length;
}

/**
 * 撤销申请。
 *
 * 只有申请人可以撤销处于待主管审批或待财务审批状态的申请。
 */
export async function cancelApplication(
	input: ApprovalInput,
	db: ApprovalDb = defaultApprovalDb
): Promise<void> {
	const [actor, application] = await Promise.all([
		db.user.findUnique({ where: { id: input.actorId }, select: { id: true, name: true } }),
		db.application.findUnique({ where: { id: input.applicationId } })
	]);

	if (!actor) throw new ServiceError('未识别当前用户，请重新切换角色后再试。', 400);
	if (!application) throw new ServiceError('未找到该申请。', 404);
	if (!canCancel(actor.id, application)) {
		if (application.applicantId !== actor.id) {
			throw new ServiceError('只有申请人可以撤销这份申请。', 403);
		}
		throw new ServiceError('当前状态不可撤销。', 400);
	}

	const now = localNow();
	await db.application.update({
		where: { id: application.id },
		data: {
			status: APPLICATION_STATUS.cancelled,
			auditLogs: {
				create: {
					id: randomUUID(),
					at: now,
					actorId: actor.id,
					actorName: actor.name,
					action: 'cancel',
					fromStatus: application.status,
					toStatus: APPLICATION_STATUS.cancelled,
					comment: '申请人撤销申请'
				}
			}
		}
	});
}
