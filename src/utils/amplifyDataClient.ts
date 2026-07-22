import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

let client: ReturnType<typeof generateClient<Schema>> | null = null;

export function getAmplifyDataClient() {
  if (!client) {
    client = generateClient<Schema>();
  }

  return client;
}
