import { ClayButton } from './ClayButton';

type Props = {
  onExit(): void;
  label?: string;
};

export function BackHome({ onExit, label = 'Về nhà' }: Props) {
  return (
    <ClayButton
      color="lilac"
      size={120}
      label={label}
      onPress={onExit}
      style={{ position: 'fixed', top: 24, left: 24, zIndex: 40 }}
    >
      🏠
    </ClayButton>
  );
}
