<script lang="ts">
    import type { ApplicationStatus } from '$lib/types/application';
    
    let { status }: { status: ApplicationStatus } = $props();
    
    const config: Record<ApplicationStatus, { label: string; bg: string; text: string; dot: string }> = {
      draft: {
        label: '草稿',
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        dot: 'bg-gray-400'
      },
      pending: {
        label: '待审批',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        dot: 'bg-yellow-500'
      },
      approved: {
        label: '已批准',
        bg: 'bg-green-50',
        text: 'text-green-700',
        dot: 'bg-green-500'
      },
      rejected: {
        label: '已拒绝',
        bg: 'bg-red-50',
        text: 'text-red-700',
        dot: 'bg-red-500'
      },
      cancelled: {
        label: '已取消',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        dot: 'bg-blue-500'
      }
    };
  </script>
  
  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {config[status].bg} {config[status].text}">
    <span class="w-2 h-2 rounded-full {config[status].dot} mr-2"></span>
    {config[status].label}
  </span>