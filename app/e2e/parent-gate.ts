import { expect, type Page } from '@playwright/test';

/** Chữ câu hỏi "7 × 8 = ?" / "38 + 47 = ?" → đáp án (tự tính như bố mẹ, không đọc từ DOM). */
export function solveGateQuestion(text: string): number {
  const m = /(\d+)\s*([+×])\s*(\d+)/.exec(text);
  if (!m) throw new Error(`Không hiểu câu hỏi cổng phụ huynh: "${text}"`);
  const [a, b] = [Number(m[1]), Number(m[3])];
  return m[2] === '×' ? a * b : a + b;
}

/**
 * Giữ ⚙️ 3 giây để hiện câu hỏi người lớn.
 * 'dispatch' (mặc định): gửi thẳng pointerdown/pointerup vào nút, không lệ thuộc toạ độ chuột.
 * 'mouse': nhấn giữ chuột thật ở giữa nút (kiểm tra cả việc chạm trúng trong khung co giãn/xoay).
 */
export async function holdParentGate(page: Page, how: 'dispatch' | 'mouse' = 'dispatch'): Promise<void> {
  const gate = page.getByRole('button', { name: 'Khu phụ huynh' });
  await expect(gate).toBeVisible();
  if (how === 'mouse') {
    const box = (await gate.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(3300);
    await page.mouse.up();
  } else {
    await gate.dispatchEvent('pointerdown');
    await page.waitForTimeout(3300);
    await gate.dispatchEvent('pointerup');
  }
  await expect(page.getByRole('dialog', { name: 'Xác nhận phụ huynh' })).toBeVisible({ timeout: 2000 });
}

/** Đọc phép tính, tự tính và chạm nút đáp án đúng (ClayButton kích hoạt khi nhả tay). */
export async function answerParentGate(page: Page, how: 'dispatch' | 'mouse' = 'dispatch'): Promise<number> {
  const confirm = page.getByRole('dialog', { name: 'Xác nhận phụ huynh' });
  const answer = solveGateQuestion((await confirm.getByTestId('gate-question').textContent()) ?? '');
  const btn = confirm.getByRole('group', { name: 'Đáp án' }).getByRole('button', { name: String(answer), exact: true });
  if (how === 'mouse') {
    await btn.click();
  } else {
    await btn.dispatchEvent('pointerdown');
    await btn.dispatchEvent('pointerup');
  }
  return answer;
}

/** Vào khu bố mẹ qua cổng thật: giữ 3 giây + chọn đáp án đúng. */
export async function openParentArea(page: Page, how: 'dispatch' | 'mouse' = 'dispatch'): Promise<void> {
  await holdParentGate(page, how);
  await answerParentGate(page, how);
  await expect(page.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toBeVisible();
}
