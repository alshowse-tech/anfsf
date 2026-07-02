import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

test('renders children when no error', () => {
  render(<ErrorBoundary><div>ok</div></ErrorBoundary>);
  expect(screen.getByText('ok')).toBeInTheDocument();
});

test('renders fallback on error', () => {
  const Throw = () => { throw new Error('test'); };
  render(<ErrorBoundary><Throw /></ErrorBoundary>);
  expect(screen.getByText(/错误/)).toBeInTheDocument();
});
