/** Mọi loại quả có model 3D (public/models/<id>.glb), thẻ hình và tiếng đọc fruit.<id>. */
export const FRUIT_IDS = [
  'apple', 'banana', 'cherries', 'grapes', 'lemon', 'orange', 'pear', 'pineapple', 'strawberry', 'watermelon',
  'kiwi', 'papaya', 'avocado', 'coconut', 'blueberry', 'peach',
] as const;

export function isFruit(id: string): boolean {
  return (FRUIT_IDS as readonly string[]).includes(id);
}
