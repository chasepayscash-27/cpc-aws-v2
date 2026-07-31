import { describe, expect, it } from 'vitest';
import { buildAmplifyConfig } from './amplify';

describe('buildAmplifyConfig', () => {
  it('maps Amplify outputs into the v6 Auth.Cognito.loginWith.oauth shape', () => {
    const config = buildAmplifyConfig({
      cognitoConfig: {
        region: 'us-east-1',
        userPoolId: 'us-east-1_example',
        clientId: 'client-123',
        domain: 'https://example.auth.us-east-1.amazoncognito.com',
        redirectSignIn: 'https://app.example.com/auth/callback',
        redirectSignOut: 'https://app.example.com',
      },
    });

    expect(config.Auth?.Cognito.userPoolId).toBe('us-east-1_example');
    expect(config.Auth?.Cognito.userPoolClientId).toBe('client-123');
    expect(config.Auth?.Cognito.loginWith?.oauth).toEqual({
      domain: 'example.auth.us-east-1.amazoncognito.com',
      scopes: ['email', 'openid', 'profile'],
      redirectSignIn: ['https://app.example.com/auth/callback'],
      redirectSignOut: ['https://app.example.com'],
      responseType: 'code',
    });
  });

  it('preserves API overrides while leaving oauth unset when Cognito env is absent', () => {
    const config = buildAmplifyConfig({
      appSyncUrl: 'https://example.appsync-api.us-east-1.amazonaws.com/graphql',
      appSyncApiKey: 'da2-example',
    });

    expect(config.API?.GraphQL?.endpoint).toBe(
      'https://example.appsync-api.us-east-1.amazonaws.com/graphql',
    );
    expect(config.API?.GraphQL?.apiKey).toBe('da2-example');
    expect(config.Auth?.Cognito.loginWith?.oauth).toBeUndefined();
  });
});
