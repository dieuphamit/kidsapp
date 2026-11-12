import { get, set } from 'idb-keyval';

const KEY = 'behoc.last-game';

/** id trò bé vừa chơi gần nhất, hoặc null nếu chưa có hay không đọc được. */
export async function loadLastGame(): Promise<string | null> {
  try {
    const id = await get<unknown>(KEY);
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

export async function saveLastGame(id: string): Promise<void> {
  try {
    await set(KEY, id);
  } catch {
    // Lưu không được (chế độ riêng tư...) thì thôi, nút chơi lại chỉ không hiện
  }
}
