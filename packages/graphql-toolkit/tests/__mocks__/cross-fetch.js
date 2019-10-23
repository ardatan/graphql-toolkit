const crossFetch = jest.genMockFromModule('cross-fetch');

let mocks = {};
let calls = {};

module.exports = {
  ...crossFetch,
  __resetMocks: () => {
    mocks = {};
    calls = {};
  },
  __registerUrlRequestMock: (url, content) => {
    mocks[url] = content;
  },
  __getCalls: url => {
    return calls[url] || [];
  },
  async fetch(url, options) {
    if (!calls[url]) {
      calls[url] = [];
    }

    calls[url].push(options);

    if (mocks[url]) {
      return {
        async json() {
          return {
            data: mocks[url],
          };
        },
      };
    } else {
      throw new Error('Invalid request');
    }
  },
};
