import { redirect } from '@sveltejs/kit';

export const load = ({ url }) => {
	const type = url.searchParams.get('type') === 'leave' ? 'leave' : 'travel';
	const editId = url.searchParams.get('edit');
	redirect(307, `/create/${type}/basic${editId ? `?edit=${encodeURIComponent(editId)}` : ''}`);
};
