import { describe, it, expect, beforeEach } from 'vitest';
import { server } from './mocks/server';
import { http } from 'msw';

describe('MSW Server Debug', () => {
  beforeEach(() => {
    server.listen();
  });

  it('should handle basic request', async () => {
    // Add a simple test handler
    server.use(
      http.get('/api/v1/test', ({ request, params, cookies }) => {
        return new Response(
          JSON.stringify({ message: 'Hello from MSW' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );

    const response = await fetch('/api/v1/test');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.message).toBe('Hello from MSW');
  });

  it('should handle login request', async () => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' })
    });

    console.log('Response status:', response.status);
    const data = await response.text();
    console.log('Response data:', data);
    
    expect(response.status).toBe(200);
  });
});