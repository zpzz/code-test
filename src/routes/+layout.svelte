<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Icon, { type IconName } from '$lib/components/common/Icon.svelte';
	import { currentUserState, initCurrentUser, setCurrentUser } from '$lib/stores/user';
	import { USER_ROLE, enumService } from '$lib/enums';

	type NavigationItem = {
		label: string;
		path: string;
		icon: IconName;
	};

	let { data } = $props();
	let allUsers = $derived(data.allUsers);
	const roleOptions = enumService.options('role');

	function roleLabel(role: string): string {
		return roleOptions.find((option) => option.value === role)?.label ?? role;
	}

	onMount(() => {
		initCurrentUser();
		if (!$currentUserState && allUsers[0]) setCurrentUser(allUsers[0]);
	});

	let currentPath = $derived(page.url.pathname);

	// 菜单权限逻辑
	let menus = $derived.by(() => {
		const role = $currentUserState?.role;
		const myApplication: NavigationItem = { label: '我的申请', path: '/request', icon: 'inbox' };
		const createApplication: NavigationItem = { label: '发起申请', path: '/create', icon: 'plus' };
		const approvalMenu: NavigationItem = { label: '待我审批', path: '/approvals', icon: 'check' };
		const statsMenu: NavigationItem = { label: '统计报表', path: '/stats', icon: 'chart' };

		if (role === USER_ROLE.manager) {
			return [myApplication, approvalMenu, createApplication, statsMenu];
		} else if (role === USER_ROLE.finance) {
			return [myApplication, approvalMenu, createApplication];
		} else {
			return [myApplication, createApplication];
		}
	});

	// 切换角色：更新 localStorage 和前端状态，并强制刷新页面
	function handleUserChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const userId = select.value;
		const selectedUser = allUsers.find((u) => u.id === userId);

		if (selectedUser) {
			setCurrentUser(selectedUser);
			if (currentPath !== '/request') goto('/request');
		}
	}
</script>

<div class="flex h-screen bg-gray-100 overflow-hidden">
	<aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
		<div class="h-16 flex items-center px-6 border-b border-gray-100">
			<h1 class="flex items-center gap-2 text-xl font-bold text-blue-600">
				<span
					class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white"
				>
					差
				</span>
				<span>差旅申请</span>
			</h1>
		</div>

		<nav class="flex-1 py-4">
			{#each menus as menu}
				<a
					href={menu.path}
					data-sveltekit-preload-data="hover"
					class="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors
					{currentPath === menu.path
						? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
						: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
				>
					<Icon name={menu.icon} class="h-5 w-5 shrink-0" strokeWidth={1.75} />
					<span>{menu.label}</span>
				</a>
			{/each}
		</nav>
	</aside>

	<div class="flex-1 flex flex-col overflow-hidden">
		<header class="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8">
			<div class="flex items-center gap-4">
				<div
					class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold"
				>
					{$currentUserState?.name?.charAt(0) || '未'}
				</div>
				<div class="leading-tight text-right">
					<div class="text-sm font-semibold text-gray-800">
						{$currentUserState?.name || '未登录'}
					</div>
					<div class="text-xs text-gray-500">
						{$currentUserState?.employeeId} · {$currentUserState?.title} · {$currentUserState?.department}
					</div>
				</div>

				<div class="ml-2">
					<select
						value={$currentUserState?.id}
						on:change={handleUserChange}
						class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
					>
						{#each allUsers as user}
							<option value={user.id}>
								{user.name} ({roleLabel(user.role)})
							</option>
						{/each}
					</select>
				</div>
			</div>
		</header>

		<main class="flex-1 overflow-y-auto p-6">
			<slot />
		</main>
	</div>
</div>
