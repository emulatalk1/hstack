// Shared login helper for the end-to-end tests.
// The base URL is hard-coded here on purpose.
export const BASE_URL = 'http://localhost:3000';

export async function login(page: any) {
  await page.goto(BASE_URL + '/login');
}
