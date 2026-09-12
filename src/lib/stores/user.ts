import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { User } from '@prisma/client';

function readStoredUser(): User | null {
	if (!browser) return null;

	const stored = localStorage.getItem('currentUser');
	if (!stored) return null;

	try {
		return JSON.parse(stored) as User;
	} catch {
		localStorage.removeItem('currentUser');
		return null;
	}
}

function syncUserCookie(user: User): void {
	document.cookie = `applicantId=${user.id}; path=/; max-age=3600`;
}

export const currentUserState = writable<User | null>(readStoredUser());

// 初始化：从 localStorage 读取（必须用浏览器环境，防止 SSR 报错）
export function initCurrentUser(): void {
	const storedUser = readStoredUser();
	if (!storedUser) return;

	currentUserState.set(storedUser);
	syncUserCookie(storedUser);
}

// 切换用户并保存
export function setCurrentUser(user: User): void {
	currentUserState.set(user);
	if (browser) {
		localStorage.setItem('currentUser', JSON.stringify(user));
		syncUserCookie(user);
	}
}
