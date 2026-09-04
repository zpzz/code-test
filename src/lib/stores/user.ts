import { browser } from "$app/environment";
import { writable } from "svelte/store";
import type { User } from "@prisma/client";

export const currentUserState = writable<User | null>(null);

// 初始化：从 localStorage 读取（必须用浏览器环境，防止 SSR 报错）
export function initCurrentUser() {
  if (!browser) return;
  const stored = localStorage.getItem("currentUser");
  if (stored) {
    currentUserState.set(JSON.parse(stored) as User);
  }
}

// 切换用户并保存
export function setCurrentUser(user: User) {
  currentUserState.set(user);
  if (browser) {
    localStorage.setItem("currentUser", JSON.stringify(user));
  }
}
