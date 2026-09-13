import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { APPLICATION_STATUS } from '$lib/enums';
import {
	getApplicationType,
	type ApplicationType
} from '$lib/domain/applicationTypes';
import { localNow } from '$lib/format/date';
import {
	getNextSubmitStatus,
	normalizeApplicationFields,
	validateApplicationForSubmit,
	type DraftFields
} from '$lib/utils';
import { prisma } from './db';
import { ServiceError } from './service-error';

/**
 * 申请服务依赖的最小数据库接口。
 *
 * 只声明服务实际使用的 Prisma Model，既减少耦合，
 * 也方便单元测试时注入 mock 数据库。
 */
export type ApplicationDb = Pick<PrismaClient, 'user' | 'application'>;

/** 创建或保存申请时所需的业务参数。 */
export type SaveApplicationInput = {
	type: ApplicationType;
	applicantId: string;
	rawFields: DraftFields;
	editId?: string;
	intent: 'save' | 'submit';
};

/** 保存申请后返回给调用方的结果。 */
export type ApplicationSaveResult = {
	applicationId: string;
	status: string;
};

/**
 * 根据申请类型生成下一个业务编号。
 *
 * 编号前缀由申请类型配置决定，例如差旅为 TR、请假为 LV。
 */
export async function nextApplicationId(
	type: ApplicationType,
	db: ApplicationDb = prisma
): Promise<string> {
	const prefix = getApplicationType(type).idPrefix;
	const latest = await db.application.findFirst({
		where: { id: { startsWith: `${prefix}-` } },
		orderBy: { id: 'desc' },
		select: { id: true }
	});
	const sequence = Number(latest?.id.slice(prefix.length + 1)) || 0;
	return `${prefix}-${String(sequence + 1).padStart(4, '0')}`;
}

/**
 * 查询可编辑的申请，并将数据库中的 JSON 字段转换为对象。
 *
 * 类型校验放在 service 内，避免不同路由重复实现编辑规则。
 */
export async function getApplicationForEdit(
	type: ApplicationType,
	editId: string,
	db: ApplicationDb = prisma
) {
	const application = await db.application.findUnique({ where: { id: editId } });
	if (!application) throw new ServiceError('未找到需要编辑的申请。', 404);
	if (application.type !== type) throw new ServiceError('申请类型不匹配。', 400);

	return {
		...application,
		fields: JSON.parse(application.fields)
	};
}

/**
 * 创建申请或更新已有草稿/已驳回申请。
 *
 * - save：只保存当前内容，状态保持草稿或原状态
 * - submit：校验完整表单，计算审批起始状态并记录提交日志
 * - 业务错误通过 ServiceError 抛出，由路由层转换成 fail()
 */
export async function saveApplication(
	input: SaveApplicationInput,
	db: ApplicationDb = prisma,
	nowFactory: () => Date = localNow
): Promise<ApplicationSaveResult> {
	const applicant = await db.user.findUnique({ where: { id: input.applicantId } });
	if (!applicant) throw new ServiceError('未识别当前申请人，请重新选择角色。', 400);

	const fields = normalizeApplicationFields(input.rawFields);
	if (input.intent === 'submit') {
		// 先执行申请类型自己的校验，再执行通用申请字段校验。
		const message =
			getApplicationType(input.type).typeRefine?.(input.rawFields) ??
			validateApplicationForSubmit(fields, input.type);
		if (message) throw new ServiceError(message, 400);
	}

	const now = nowFactory();
	const status =
		input.intent === 'submit'
			? getNextSubmitStatus(applicant.role)
			: APPLICATION_STATUS.draft;
	const existing = input.editId
		? await db.application.findUnique({ where: { id: input.editId } })
		: null;

	if (input.editId && !existing) {
		throw new ServiceError('未找到需要编辑的申请。', 404);
	}

	if (
		existing &&
		(existing.applicantId !== applicant.id ||
			existing.type !== input.type ||
			(existing.status !== APPLICATION_STATUS.draft &&
				existing.status !== APPLICATION_STATUS.rejected))
	) {
		// 只有申请人本人可以编辑草稿或已驳回申请。
		throw new ServiceError('当前申请不可编辑。', 403);
	}

	if (existing) {
		// 编辑草稿时保留原状态；重新提交时才重新计算审批状态并写提交日志。
		await db.application.update({
			where: { id: existing.id },
			data: {
				fields: JSON.stringify(fields),
				status: input.intent === 'submit' ? status : existing.status,
				submittedAt: input.intent === 'submit' ? now : existing.submittedAt,
				auditLogs:
					input.intent === 'submit'
						? {
								create: {
									id: randomUUID(),
									at: now,
									actorId: applicant.id,
									actorName: applicant.name,
									action: 'submit',
									fromStatus: existing.status,
									toStatus: status
								}
							}
						: undefined
			}
		});

		return { applicationId: existing.id, status: input.intent === 'submit' ? status : existing.status };
	}

	const applicationId = await nextApplicationId(input.type, db);
	// 新申请统一通过 create 写入，提交时同时创建第一条审批日志。
	await db.application.create({
		data: {
			id: applicationId,
			type: input.type,
			applicantId: applicant.id,
			applicantName: applicant.name,
			department: applicant.department,
			status,
			fields: JSON.stringify(fields),
			createdAt: now,
			submittedAt: input.intent === 'submit' ? now : null,
			auditLogs:
				input.intent === 'submit'
					? {
							create: {
								id: randomUUID(),
								at: now,
								actorId: applicant.id,
								actorName: applicant.name,
								action: 'submit',
								fromStatus: APPLICATION_STATUS.draft,
								toStatus: status
							}
						}
					: undefined
		}
	});

	return { applicationId, status };
}
