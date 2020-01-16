const crossFetch = jest.genMockFromModule('cross-fetch');

let mocks = {};
let calls = {};

module.exports = {
  ...crossFetch,
  __resetMocks: () => {
    mocks = {};
    calls = {};
  },
  __registerUrlRequestMock: (url, handler) => {
    mocks[url] = handler;
  },
  __getCalls: url => {
    return calls[url] || [];
  },
  async fetch(url, options) {
    if (!calls[url]) {
      calls[url] = [];
    }

    if (mocks[url]) {
      const handler = mocks[url];
      const response = handler(options);
      calls[url].push(response); 
      return response;
    } else {
      throw new Error('Invalid request');
    }
  },
};
