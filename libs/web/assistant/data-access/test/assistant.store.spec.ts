import { describe, expect, it } from 'vitest';
import { AssistantStore } from '../src/index';

describe('AssistantStore', () => {
  it('defines AssistantStore signal store', () => {
    expect(AssistantStore).toBeDefined();
  });
});
