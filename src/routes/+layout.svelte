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
	async function handleUserChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const userId = select.value;
		const selectedUser = allUsers.find((u) => u.id === userId);

		if (selectedUser) {
			setCurrentUser(selectedUser);
			await goto('/request', { replaceState: true, invalidateAll: true });
		}
	}
</script>

<div class="flex h-screen overflow-hidden bg-gray-100">
	<aside class="flex w-64 flex-col border-r border-gray-200 bg-white">
		<div class="flex h-16 items-center border-b border-gray-100 px-6">
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
						? 'border-r-2 border-blue-600 bg-blue-50 text-blue-600'
						: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
				>
					<Icon name={menu.icon} class="h-5 w-5 shrink-0" strokeWidth={1.75} />
					<span>{menu.label}</span>
				</a>
			{/each}
		</nav>
	</aside>

	<div class="flex flex-1 flex-col overflow-hidden">
		<header class="flex h-16 items-center justify-end border-b border-gray-200 bg-white px-8">
			<div class="flex items-center gap-4">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white"
				>
					{$currentUserState?.name?.charAt(0) || '未'}
				</div>
				<div class="text-right leading-tight">
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
						onchange={handleUserChange}
						class="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
