import { render, screen } from '@testing-library/react';
import { useShogun } from 'shogun-button-react';
import ExampleContent from './ExampleContent';
import { expect, vi, it, describe } from 'vitest';

// Mock shogun-button-react
vi.mock('shogun-button-react', () => ({
  useShogun: vi.fn(),
}));

describe('ExampleContent Component', () => {
  it('renders unauthenticated state correctly', () => {
    vi.mocked(useShogun).mockReturnValue({
      isLoggedIn: false,
      userPub: '',
      username: '',
      sdk: null as any,
      logout: vi.fn(),
    });

    render(<ExampleContent />);

    expect(screen.getByText('Welcome to Shogun Starter')).toBeInTheDocument();
    expect(screen.getByText(/Please authenticate using the button above/)).toBeInTheDocument();
    expect(screen.getByText(/This is example content/)).toBeInTheDocument();
  });

  it('renders authenticated state correctly with user info', () => {
    const mockUserPub = '0x1234567890abcdef';
    const mockUsername = 'testuser';
    const mockSdk = { gun: {} } as any;

    vi.mocked(useShogun).mockReturnValue({
      isLoggedIn: true,
      userPub: mockUserPub,
      username: mockUsername,
      sdk: mockSdk,
      logout: vi.fn(),
    });

    render(<ExampleContent />);

    expect(screen.getByText('Example: User Information')).toBeInTheDocument();
    expect(screen.getByText(mockUsername)).toBeInTheDocument();
    expect(screen.getByText(mockUserPub)).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument(); // SDK Available
    expect(screen.getByText(/SDK is ready!/)).toBeInTheDocument();
  });

  it('handles missing username in authenticated state', () => {
    vi.mocked(useShogun).mockReturnValue({
      isLoggedIn: true,
      userPub: '0x123',
      username: '',
      sdk: {} as any,
      logout: vi.fn(),
    });

    render(<ExampleContent />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
