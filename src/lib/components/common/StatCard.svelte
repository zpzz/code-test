<script lang="ts">
    // 接收父组件传入的参数
    let { 
        label, 
        value, 
        colorClass = 'text-blue-600' // 默认蓝色
    }: { 
        label: string; 
        value: string | number; 
        colorClass?: string 
    } = $props();
</script>

<div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <p class="text-sm text-gray-500">{label}</p>
    <p class="text-3xl font-bold mt-2 {colorClass}">{value}</p>
</div>