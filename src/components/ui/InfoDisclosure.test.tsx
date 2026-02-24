import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InfoDisclosure } from './InfoDisclosure';

describe('InfoDisclosure', () => {
  it('default hidden and toggles panel', async () => {
    const user = userEvent.setup();

    render(
      <InfoDisclosure label="안내 열기" title="테스트 안내">
        <p>숨김 정보</p>
      </InfoDisclosure>
    );

    const button = screen.getByRole('button', { name: '안내 열기' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveClass('h-8');
    expect(button).toHaveClass('w-8');
    expect(screen.queryByText('숨김 정보')).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('테스트 안내')).toBeInTheDocument();
    expect(screen.getByText('숨김 정보')).toBeInTheDocument();
  });
});
