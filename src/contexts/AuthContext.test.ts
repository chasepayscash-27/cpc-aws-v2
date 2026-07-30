import { describe, it, expect } from 'vitest';
import { normalizeAuthError } from './AuthContext';

describe('normalizeAuthError', () => {
  it('maps NotAuthorizedException to incorrect-credentials message', () => {
    const err = normalizeAuthError({ name: 'NotAuthorizedException' });
    expect(err.code).toBe('NotAuthorizedException');
    expect(err.message).toMatch(/incorrect email or password/i);
  });

  it('maps UserNotFoundException to no-account message', () => {
    const err = normalizeAuthError({ name: 'UserNotFoundException' });
    expect(err.code).toBe('UserNotFoundException');
    expect(err.message).toMatch(/no account found/i);
  });

  it('maps TooManyRequestsException to rate-limit message', () => {
    const err = normalizeAuthError({ name: 'TooManyRequestsException' });
    expect(err.code).toBe('TooManyRequestsException');
    expect(err.message).toMatch(/too many attempts/i);
  });

  it('maps LimitExceededException to rate-limit message', () => {
    const err = normalizeAuthError({ name: 'LimitExceededException' });
    expect(err.code).toBe('LimitExceededException');
    expect(err.message).toMatch(/too many attempts/i);
  });

  it('maps InvalidPasswordException to the provided message', () => {
    const err = normalizeAuthError({
      name: 'InvalidPasswordException',
      message: 'Password must have uppercase characters',
    });
    expect(err.code).toBe('InvalidPasswordException');
    expect(err.message).toBe('Password must have uppercase characters');
  });

  it('falls back to the error message for unknown error names', () => {
    const err = normalizeAuthError({
      name: 'SomethingElse',
      message: 'Internal error',
    });
    expect(err.code).toBe('SomethingElse');
    expect(err.message).toBe('Internal error');
  });

  it('provides a default message when neither name nor message are set', () => {
    const err = normalizeAuthError({});
    expect(err.code).toBe('UnknownError');
    expect(err.message).toMatch(/unexpected error/i);
  });
});
