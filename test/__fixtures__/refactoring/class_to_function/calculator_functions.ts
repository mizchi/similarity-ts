// Functional Calculator with state parameter
interface CalculatorState {
  value: number;
}

const add = (state: CalculatorState, n: number): number => {
  state.value += n;
  return state.value;
};

const subtract = (state: CalculatorState, n: number): number => {
  state.value -= n;
  return state.value;
};

const multiply = (state: CalculatorState, n: number): number => {
  state.value *= n;
  return state.value;
};

const divide = (state: CalculatorState, n: number): number => {
  if (n === 0) {
    throw new Error('Division by zero');
  }
  state.value /= n;
  return state.value;
};

const reset = (state: CalculatorState): void => {
  state.value = 0;
};

const getValue = (state: CalculatorState): number => {
  return state.value;
};