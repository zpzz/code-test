import { beforeEach, describe, expect, it } from 'vitest';
import {
	APPLICATION_STATUS,
	EnumFactory,
	EnumService,
	TRANSPORT,
	USER_ROLE,
	URGENCY,
	enumService
} from '$lib/enums';

describe('EnumService', () => {
	beforeEach(() => {
		enumService.configure('static');
	});

	it('returns static options with label and value', () => {
		const options = enumService.options('transport');
		const enumKeys = [
			'applicationStatus',
			'applicationStatusColor',
			'applicationStatusClass',
			'role',
			'urgency',
			'transport'
		] as const;

		expect(options).toHaveLength(4);
		expect(options).toContainEqual({ label: '飞机', value: TRANSPORT.flight });
		for (const key of enumKeys) {
			expect(enumService.options(key).every((option) => Object.keys(option).sort().join(',') === 'label,value')).toBe(
				true
			);
		}
		expect(enumService.label('urgency', URGENCY.urgent)).toBe('紧急');
	});

	it('checks whether an enum value exists', () => {
		expect(enumService.has('role', USER_ROLE.manager)).toBe(true);
		expect(enumService.has('role', 'admin')).toBe(false);
	});

	it('uses a singleton service instance', () => {
		expect(EnumService.getInstance()).toBe(enumService);
	});

	it('returns the configured application status color', () => {
		expect(enumService.color(APPLICATION_STATUS.pendingManager)).toBe('#f59e0b');
		expect(enumService.className(APPLICATION_STATUS.approved)).toContain('text-emerald-700');
	});

	it('supports factory-created hybrid providers with static fallback', () => {
		const provider = EnumFactory.create('hybrid', {
			urgency: [{ label: '高优先级', value: URGENCY.urgent }]
		});

		expect(provider.options('urgency')).toEqual([{ label: '高优先级', value: URGENCY.urgent }]);
		expect(provider.options('transport')).toHaveLength(4);
	});
});
