/**
 * 业务层错误。
 *
 * Service 不直接依赖 SvelteKit 的 fail/redirect，
 * 由路由层统一把错误转换成对应的 HTTP 响应。
 */
export class ServiceError extends Error {
	/** HTTP 状态码由路由层使用，service 本身不直接生成 HTTP 响应。 */
	constructor(
		message: string,
		public readonly status = 400
	) {
		super(message);
		this.name = 'ServiceError';
	}
}
