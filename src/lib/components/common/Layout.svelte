<script lang="ts">
    import { page } from '$app/stores';
  </script>
  
  <div class="min-h-screen bg-gray-50">
    <!-- 导航栏 -->
    <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center space-x-8">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">✈️</span>
              <span class="text-xl font-bold text-gray-900">差旅申请系统</span>
            </div>
            <div class="hidden sm:flex space-x-4">
              <a 
                href="/" 
                class="px-3 py-2 rounded-md text-sm font-medium {$page.url.pathname === '/' || $page.url.pathname.startsWith('/detail/') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'} transition-colors"
              >
                📋 申请列表
              </a>
              <a 
                href="/create" 
                class="px-3 py-2 rounded-md text-sm font-medium {$page.url.pathname === '/create' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'} transition-colors"
              >
                ➕ 发起申请
              </a>
              <a 
                href="/stats" 
                class="px-3 py-2 rounded-md text-sm font-medium {$page.url.pathname.startsWith('/statistics') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'} transition-colors"
              >
                📊 统计报表
              </a>
            </div>
          </div>
          
          <!-- 用户信息 -->
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span class="text-blue-600 font-semibold text-sm">张</span>
            </div>
            <span class="text-sm text-gray-700 hidden sm:inline">张明</span>
          </div>
        </div>
      </div>
    </nav>
  
    <!-- 主要内容 -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>