import type { AuthStatus } from './auth.types.js';

export class AuthService {
  static getStatus(): AuthStatus {
    return {
      authEnabled: false,
      phase: 'foundation',
    };
  }
}
