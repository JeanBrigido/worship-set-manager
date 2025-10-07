import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton Component', () => {
  it('should render a skeleton loading placeholder', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;

    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded-md');
    expect(skeleton).toHaveClass('bg-muted');
  });

  it('should apply custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    const skeleton = container.firstChild as HTMLElement;

    expect(skeleton).toHaveClass('h-10');
    expect(skeleton).toHaveClass('w-full');
    expect(skeleton).toHaveClass('animate-pulse'); // Base classes still applied
  });

  it('should accept and render additional props', () => {
    render(<Skeleton data-testid="test-skeleton" />);
    const skeleton = screen.getByTestId('test-skeleton');

    expect(skeleton).toBeInTheDocument();
  });

  it('should render multiple skeletons for loading states', () => {
    render(
      <div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });

  it('should support different sizes via className', () => {
    const { rerender, container } = render(<Skeleton className="h-20 w-20" />);
    let skeleton = container.firstChild as HTMLElement;

    expect(skeleton).toHaveClass('h-20');
    expect(skeleton).toHaveClass('w-20');

    rerender(<Skeleton className="h-40 w-40" />);
    skeleton = container.firstChild as HTMLElement;

    expect(skeleton).toHaveClass('h-40');
    expect(skeleton).toHaveClass('w-40');
  });

  it('should maintain aspect ratio for different shapes', () => {
    const { container } = render(
      <>
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-32" />
      </>
    );

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons[0]).toHaveClass('rounded-full'); // Circle
    expect(skeletons[1]).toHaveClass('w-full'); // Full width line
    expect(skeletons[2]).toHaveClass('h-32'); // Square
  });
});
