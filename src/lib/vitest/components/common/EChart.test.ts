import { cleanup, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EChartsOption } from 'echarts';
import { tick } from 'svelte';
import EChart from '$lib/components/common/EChart.svelte';

const echartsMocks = vi.hoisted(() => {
	const chart = {
		setOption: vi.fn(),
		resize: vi.fn(),
		dispose: vi.fn()
	};

	return {
		chart,
		init: vi.fn(() => chart)
	};
});

const resizeObserverMocks = vi.hoisted(() => ({
	observe: vi.fn(),
	disconnect: vi.fn()
}));

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('echarts', () => ({ init: echartsMocks.init }));

class ResizeObserverMock {
	constructor(_callback: ResizeObserverCallback) {}

	observe = resizeObserverMocks.observe;
	disconnect = resizeObserverMocks.disconnect;
}

describe('EChart', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('ResizeObserver', ResizeObserverMock);
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('initializes the chart with the supplied option and height', () => {
		const option: EChartsOption = { series: [{ type: 'line', data: [1, 2, 3] }] };
		const onReady = vi.fn();
		const { container } = render(EChart, {
			props: { option, height: '280px', onReady }
		});

		expect(echartsMocks.init).toHaveBeenCalledOnce();
		expect(echartsMocks.chart.setOption).toHaveBeenCalledWith(option, true);
		expect(resizeObserverMocks.observe).toHaveBeenCalledOnce();
		expect(onReady).toHaveBeenCalledWith(echartsMocks.chart);
		expect((container.querySelector('.chart') as HTMLElement).style.height).toBe('280px');
	});

	it('updates the existing chart instance when its option changes', async () => {
		const initialOption: EChartsOption = { series: [{ type: 'line', data: [1] }] };
		const nextOption: EChartsOption = { series: [{ type: 'line', data: [2] }] };
		const view = render(EChart, { props: { option: initialOption } });

		await tick();
		await vi.advanceTimersByTimeAsync(60);
		echartsMocks.chart.setOption.mockClear();

		await view.rerender({ option: nextOption });
		await tick();
		await vi.advanceTimersByTimeAsync(60);

		expect(echartsMocks.chart.setOption).toHaveBeenCalledOnce();
		expect(echartsMocks.chart.setOption).toHaveBeenCalledWith(nextOption, true);
	});

	it('disconnects and disposes the chart during teardown', () => {
		const onDispose = vi.fn();
		const view = render(EChart, {
			props: { option: {}, onDispose }
		});

		view.unmount();

		expect(resizeObserverMocks.disconnect).toHaveBeenCalledOnce();
		expect(onDispose).toHaveBeenCalledWith(echartsMocks.chart);
		expect(echartsMocks.chart.dispose).toHaveBeenCalledOnce();
	});
});
