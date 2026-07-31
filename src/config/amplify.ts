import { type ResourcesConfig } from 'aws-amplify';
import { parseAmplifyConfig } from 'aws-amplify/utils';
import outputs from '../../amplify/amplify_outputs.json';
import type { CognitoConfig } from './cognito';

const OAUTH_SCOPES = ['email', 'openid', 'profile'] as const;

interface BuildAmplifyConfigOptions {
  appSyncApiKey?: string;
  appSyncUrl?: string;
  cognitoConfig?: CognitoConfig;
}

export function buildAmplifyConfig({
  appSyncApiKey,
  appSyncUrl,
  cognitoConfig,
}: BuildAmplifyConfigOptions = {}): ResourcesConfig {
  const amplifyConfig = parseAmplifyConfig({
    ...outputs,
    data: {
      ...outputs.data,
      ...(appSyncUrl ? { url: appSyncUrl } : {}),
      ...(appSyncApiKey ? { api_key: appSyncApiKey } : {}),
    },
  });

  if (!cognitoConfig) {
    return amplifyConfig;
  }

  const cognito = amplifyConfig.Auth?.Cognito;
  if (!cognito?.identityPoolId) {
    return amplifyConfig;
  }

  amplifyConfig.Auth = {
    Cognito: {
      ...cognito,
      identityPoolId: cognito.identityPoolId,
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.clientId,
      loginWith: {
        ...cognito?.loginWith,
        oauth: {
          domain: cognitoConfig.domain.replace(/^https?:\/\//, ''),
          scopes: [...OAUTH_SCOPES],
          redirectSignIn: [cognitoConfig.redirectSignIn],
          redirectSignOut: [cognitoConfig.redirectSignOut],
          responseType: 'code',
        },
      },
    },
  };

  return amplifyConfig;
}
