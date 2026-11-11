import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Scenery, type SceneryVariant } from './Scenery';

const VARIANTS: SceneryVariant[] = ['garden', 'farm', 'meadow', 'orchard', 'room'];

describe('Scenery', () => {
  it.each(VARIANTS)('cảnh %s chỉ để trang trí: aria-hidden, vẽ một SVG khung 1194×834', (variant) => {
    const { container } = render(<Scenery variant={variant} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.dataset.scenery).toBe(variant);
    expect(root.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 1194 834');
  });

  it('id gradient không trùng giữa hai phong cảnh trên cùng trang', () => {
    const { container } = render(
      <>
        <Scenery variant="farm" />
        <Scenery variant="room" />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
