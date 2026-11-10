export interface State {
  picked: number[];
  done: boolean;
}

export interface PickResult {
  state: State;
  count: number | null;
}

export function initial(): State {
  return { picked: [], done: false };
}

export function pick(state: State, fruitId: number): PickResult {
  if (state.picked.includes(fruitId)) {
    return { state, count: null };
  }
  const newPicked = [...state.picked, fruitId];
  const done = newPicked.length >= 10;
  return {
    state: { picked: newPicked, done },
    count: newPicked.length,
  };
}

export function reset(): State {
  return initial();
}
