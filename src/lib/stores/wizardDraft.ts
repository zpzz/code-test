import { writable } from 'svelte/store';

export type WizardDraftState = {
	key: string;
	fields: Record<string, unknown>;
};

export const wizardDraft = writable<WizardDraftState | null>(null);

export function clearWizardDraft(): void {
	wizardDraft.set(null);
}
