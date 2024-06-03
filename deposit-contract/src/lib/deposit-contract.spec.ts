import { depositContract } from './deposit-contract';

describe('depositContract', () => {
  it('should work', () => {
    expect(depositContract()).toEqual('deposit-contract');
  });
});
