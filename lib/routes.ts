export function getRoleRoute(role: string): string {
  switch (role) {
    case 'donor':
      return '/donor';
    case 'volunteer':
      return '/volunteer';
    case 'foodbank':
      return '/charity/dashboard';
    default:
      return '/onboarding';
  }
}
