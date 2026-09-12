import { APPLICATION_TYPES, type ApplicationType, type StepDef } from './applicationTypes';

export function stepsOf(type: ApplicationType): StepDef[] {
	return APPLICATION_TYPES[type].steps;
}

export function isStepSlug(type: ApplicationType, slug: string): boolean {
	return stepsOf(type).some((step) => step.slug === slug);
}

export function stepIndex(type: ApplicationType, slug: string): number {
	return Math.max(
		0,
		stepsOf(type).findIndex((step) => step.slug === slug)
	);
}

export function stepHref(type: ApplicationType, slug: string, editId?: string | null): string {
	const query = editId ? `?edit=${encodeURIComponent(editId)}` : '';
	return `/create/${type}/${slug}${query}`;
}
