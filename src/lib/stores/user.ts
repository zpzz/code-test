import { browser } from '$app/environment';
import type { User } from '@prisma/client';

// Svelte 5 全局响应式状态
export const currentUserState = $state<{ user: User | null }>({ user: null });

// 初始化：从 localStorage 读取（必须用浏览器环境，防止 SSR 报错）
export function initCurrentUser() {
	if (!browser) return;
	const stored = localStorage.getItem('currentUser');
	if (stored) {
		currentUserState.user = JSON.parse(stored);
	}
}

// 切换用户并保存
export function setCurrentUser(user: User) {
	currentUserState.user = user;
	if (browser) {
		localStorage.setItem('currentUser', JSON.stringify(user));
	}
}