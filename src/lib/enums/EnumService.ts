// 枚举服务、Provider 与工厂实现。
import {
	localEnum,
	type ApplicationStatusValue,
	type LocalEnumOption
} from './localEnum';

export type EnumKey = keyof typeof localEnum;
export type EnumValue<K extends EnumKey> = (typeof localEnum)[K][number]['value'];
export type EnumOptionFor<K extends EnumKey> = (typeof localEnum)[K][number];
export type EnumCatalogOverrides = Partial<{
	[K in EnumKey]: readonly LocalEnumOption<string>[];
}>;
export type EnumSource = 'static' | 'remote' | 'hybrid';

/**
 * 枚举数据源统一协议。
 *
 * 后续接入后端接口时，只需要新增一个 Provider，
 * 页面和 EnumService 不需要感知具体的数据来源。
 */
export interface EnumProvider {
	options<K extends EnumKey>(key: K): readonly EnumOptionFor<K>[];
}

/**
 * 静态枚举 Provider。
 *
 * 当前项目没有后端枚举接口，因此默认使用 localEnum。
 */
export class StaticEnumProvider implements EnumProvider {
	constructor(private readonly catalog: typeof localEnum = localEnum) {}

	options<K extends EnumKey>(key: K): readonly EnumOptionFor<K>[] {
		return this.catalog[key];
	}
}

/**
 * 后端枚举 Provider。
 *
 * 当前先通过构造参数模拟接口返回的数据，
 * 后续可以把 catalog 替换成接口请求结果。
 */
export class RemoteEnumProvider implements EnumProvider {
	constructor(private readonly catalog: EnumCatalogOverrides = {}) {}

	options<K extends EnumKey>(key: K): readonly EnumOptionFor<K>[] {
		return (this.catalog[key] ?? []) as readonly EnumOptionFor<K>[];
	}
}

/**
 * 混合枚举 Provider。
 *
 * 后端有数据时优先使用后端数据，
 * 后端没有返回某个枚举时回退到本地静态枚举。
 */
export class HybridEnumProvider implements EnumProvider {
	private readonly staticProvider = new StaticEnumProvider();
	private readonly remoteProvider: RemoteEnumProvider;

	constructor(remoteCatalog: EnumCatalogOverrides = {}) {
		this.remoteProvider = new RemoteEnumProvider(remoteCatalog);
	}

	options<K extends EnumKey>(key: K): readonly EnumOptionFor<K>[] {
		const remoteOptions = this.remoteProvider.options(key);
		return remoteOptions.length > 0 ? remoteOptions : this.staticProvider.options(key);
	}
}

/**
 * Provider 工厂。
 *
 * 业务代码不直接 new Provider，统一通过工厂创建，
 * 方便未来切换静态、接口或混合数据源。
 */
export class EnumFactory {
	static create(
		source: EnumSource = 'static',
		remoteCatalog: EnumCatalogOverrides = {}
	): EnumProvider {
		switch (source) {
			case 'remote':
				return new RemoteEnumProvider(remoteCatalog);
			case 'hybrid':
				return new HybridEnumProvider(remoteCatalog);
			default:
				return new StaticEnumProvider();
		}
	}
}

/**
 * 枚举服务单例。
 *
 * 页面只依赖这个实例：
 * - options：获取下拉框、筛选器需要的 label/value
 * - label：根据 value 获取展示文本
 * - has：判断接口返回值是否属于已知枚举
 * - color/className：获取审批状态的图表颜色和徽标样式
 */
export class EnumService {
	private static instance: EnumService;
	private provider: EnumProvider;

	private constructor(provider: EnumProvider = EnumFactory.create('static')) {
		this.provider = provider;
	}

	/**
	 * 获取全局唯一的枚举服务实例。
	 */
	static getInstance(): EnumService {
		if (!EnumService.instance) {
			EnumService.instance = new EnumService();
		}

		return EnumService.instance;
	}

	/**
	 * 切换枚举数据源。
	 */
	configure(source: EnumSource, remoteCatalog: EnumCatalogOverrides = {}): void {
		this.provider = EnumFactory.create(source, remoteCatalog);
	}

	/**
	 * 直接获取指定枚举的选项数组，选项格式始终为 label/value。
	 */
	options<K extends EnumKey>(key: K): readonly EnumOptionFor<K>[] {
		return this.provider.options(key);
	}

	/**
	 * 根据枚举值获取展示文本，未知值直接原样返回。
	 */
	label<K extends EnumKey>(key: K, value: string): string {
		return this.options(key).find((option) => option.value === value)?.label ?? value;
	}

	/**
	 * 判断值是否存在于指定枚举中。
	 */
	has<K extends EnumKey>(key: K, value: string): value is EnumValue<K> {
		return this.options(key).some((option) => option.value === value);
	}

	/**
	 * 获取审批状态对应的图表颜色。
	 */
	color(status: ApplicationStatusValue | string): string {
		return (
			this.options('applicationStatusColor').find((option) => option.label === status)?.value ??
			'#64748b'
		);
	}

	/**
	 * 获取审批状态对应的 Tailwind class。
	 *
	 * 样式作为独立的 applicationStatusClass 静态枚举保存，
	 * 但仍然遵循统一的 label/value 格式。
	 */
	className(status: ApplicationStatusValue | string): string {
		return (
			this.options('applicationStatusClass').find((option) => option.label === status)?.value ??
			'inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'
		);
	}
}

/**
 * 应用全局唯一的枚举服务实例。
 */
export const enumService = EnumService.getInstance();
