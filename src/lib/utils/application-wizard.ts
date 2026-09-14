import type { FieldDef } from '$lib/domain/applicationTypes';
import { centsToYuan, formatAmount, getEnumLabel } from './application';

/**
 * 动态申请表单的统一字段容器。
 *
 * 字段由申请类型配置驱动，因此这里使用通用的键值结构。
 */
export type FormValue = Record<string, unknown>;

/**
 * 根据字段定义创建一份可直接绑定到表单的初始值。
 *
 * 可重复字段默认创建一行，单选字段默认选中第一个选项，
 * 数字字段默认使用 0，其他字段使用空字符串。
 */
export function createInitialFields(fieldDefs: FieldDef[]): FormValue {
	const result: FormValue = {};

	for (const field of fieldDefs) {
		if (field.kind === 'group') {
			result[field.key] = createInitialFields(field.fields);
		} else if (field.kind === 'repeatable') {
			result[field.key] = [createInitialFields(field.itemFields)];
		} else if (field.kind === 'radio') {
			result[field.key] = field.options[0]?.value ?? '';
		} else if (field.kind === 'number') {
			result[field.key] = 0;
		} else if (field.kind === 'dateRange') {
			result[field.key] = { [field.fromKey]: '', [field.toKey]: '' };
		} else {
			result[field.key] = '';
		}
	}

	return result;
}

/**
 * 将数据库中的字段转换为表单字段。
 *
 * 数据库金额以分保存，编辑表单中的金额需要转换为元。
 * 同时兼容请假日期既可能嵌套在 range 中，也可能平铺保存的历史数据。
 */
export function toFormFields(fieldDefs: FieldDef[], source: FormValue): FormValue {
	const result: FormValue = {};

	for (const field of fieldDefs) {
		const value = source[field.key];

		if (field.kind === 'group') {
			result[field.key] = toFormFields(field.fields, (value as FormValue) ?? {});
		} else if (field.kind === 'repeatable') {
			const rows = (Array.isArray(value) ? value : []).map((row) =>
				toFormFields(field.itemFields, row as FormValue)
			);
			result[field.key] =
				rows.length > 0 || !field.min ? rows : [createInitialFields(field.itemFields)];
		} else if (field.kind === 'dateRange') {
			const range = (value as FormValue | undefined) ?? {};
			result[field.key] = {
				[field.fromKey]: range[field.fromKey] ?? source[field.fromKey] ?? '',
				[field.toKey]: range[field.toKey] ?? source[field.toKey] ?? ''
			};
		} else if (field.kind === 'number' && field.money) {
			result[field.key] = centsToYuan(Number(value) || 0);
		} else {
			result[field.key] = value ?? (field.kind === 'number' ? 0 : '');
		}
	}

	return result;
}

/**
 * 将缓存草稿与字段定义合并，补齐新增字段的默认值。
 *
 * 这样可以兼容用户修改申请类型配置后留下的旧草稿，
 * 也能保证可重复字段和日期范围始终拥有稳定的数据结构。
 */
export function mergeInitialFields(fieldDefs: FieldDef[], source: FormValue): FormValue {
	const result: FormValue = {};

	for (const field of fieldDefs) {
		const value = source[field.key];

		if (field.kind === 'group') {
			result[field.key] = mergeInitialFields(field.fields, (value as FormValue) ?? {});
		} else if (field.kind === 'repeatable') {
			const rows = Array.isArray(value)
				? value.map((row) => mergeInitialFields(field.itemFields, row as FormValue))
				: [];
			result[field.key] =
				rows.length > 0 || !field.min ? rows : [createInitialFields(field.itemFields)];
		} else if (field.kind === 'dateRange') {
			const range = (value as FormValue | undefined) ?? {};
			result[field.key] = {
				[field.fromKey]: range[field.fromKey] ?? source[field.fromKey] ?? '',
				[field.toKey]: range[field.toKey] ?? source[field.toKey] ?? ''
			};
		} else {
			result[field.key] =
				value ??
				(field.kind === 'number'
					? 0
					: field.kind === 'radio'
						? field.options[0]?.value ?? ''
						: '');
		}
	}

	return result;
}

/**
 * 读取预览页需要展示的字段值。
 *
 * 日期范围优先读取字段自身的嵌套对象，找不到时再兼容平铺字段。
 */
export function valueForPreview(field: FieldDef, source: FormValue): unknown {
	if (field.kind === 'dateRange') {
		return source[field.key] ?? {
			[field.fromKey]: source[field.fromKey],
			[field.toKey]: source[field.toKey]
		};
	}

	return source[field.key];
}

/**
 * 展开分组字段，生成预览页使用的扁平字段列表。
 */
export function flattenPreviewFields(fieldDefs: FieldDef[]): FieldDef[] {
	return fieldDefs.flatMap((field) => {
		if (field.kind === 'group') return flattenPreviewFields(field.fields);
		return [field];
	});
}

/**
 * 将字段值格式化为预览页可读的文本。
 *
 * 枚举显示 label，金额显示人民币格式，可重复字段按行展示，
 * 空值统一显示为短横线。
 */
export function displayValue(field: FieldDef, value: unknown): string {
	if (field.kind === 'select' || field.kind === 'radio') {
		return getEnumLabel(field.options, String(value ?? ''));
	}

	if (field.kind === 'number') {
		return field.money ? formatAmount(centsToYuan(Number(value) || 0)) : String(value ?? '-');
	}

	if (field.kind === 'dateRange') {
		const range = (value as FormValue | undefined) ?? {};
		return `${range[field.fromKey] || '-'} 至 ${range[field.toKey] || '-'}`;
	}

	if (field.kind === 'repeatable') {
		const rows = Array.isArray(value) ? value : [];
		return rows
			.map((row, index) => {
				const item = row as FormValue;
				const parts = field.itemFields
					.filter((child) => child.kind !== 'repeatable' && child.kind !== 'group')
					.map((child) => `${child.label}: ${displayValue(child, item[child.key])}`);
				return `${index + 1}. ${parts.join('，')}`;
			})
			.join('\n');
	}

	return String(value ?? '').trim() || '-';
}

/**
 * 校验单个动态字段及其嵌套字段是否完整。
 *
 * 返回布尔值，页面可以据此决定是否允许进入下一步，
 * 具体的错误提示仍由页面根据字段上下文展示。
 */
export function validateField(field: FieldDef, value: unknown): boolean {
	if (field.kind === 'group') {
		const groupValue = (value as FormValue | undefined) ?? {};
		return field.fields.every((child) => validateField(child, groupValue[child.key]));
	}

	if (field.kind === 'repeatable') {
		const rows = Array.isArray(value) ? value : [];
		return (
			rows.length >= (field.min ?? 0) &&
			rows.length <= (field.max ?? 10) &&
			rows.every((row) => {
				const rowValue = row as FormValue;
				return field.itemFields.every((child) => validateField(child, rowValue[child.key]));
			})
		);
	}

	if (field.kind === 'dateRange') {
		const range = (value as FormValue | undefined) ?? {};
		if (field.required && (!range[field.fromKey] || !range[field.toKey])) return false;
		return (
			!range[field.fromKey] ||
			!range[field.toKey] ||
			String(range[field.toKey]) >= String(range[field.fromKey])
		);
	}

	if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
		return false;
	}

	if (field.kind === 'text' || field.kind === 'textarea') {
		if (typeof value === 'string' && field.minLength && value.trim().length < field.minLength) {
			return false;
		}
		if (typeof value === 'string' && field.maxLength && value.trim().length > field.maxLength) {
			return false;
		}
	}

	return true;
}
