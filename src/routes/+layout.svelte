<script lang="ts">
	import '../app.css';
	import Layout from '$lib/components/common/Layout.svelte';
	import { onMount } from 'svelte';
	import { applicationStore } from '$lib/stores/applicationStore';
  
	onMount(() => {
	  applicationStore.load();
	});
  </script>
  
  <Layout>
	<slot />
  </Layout>