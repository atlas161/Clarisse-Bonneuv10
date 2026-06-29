import { EventEmitter } from 'node:events';
import { handleAdminApi } from '../../server/admin-api.js';

const normalizeHeaders = (headers = {}) =>
  Object.fromEntries(Object.entries(headers).map(([key, value]) => [String(key || '').toLowerCase(), value]));

const createMockRequest = (event) => {
  const req = new EventEmitter();
  const body =
    typeof event.body === 'string'
      ? event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body
      : '';

  req.method = event.httpMethod || 'GET';
  req.headers = normalizeHeaders(event.headers);
  const searchParams = new URLSearchParams(event.queryStringParameters || {});
  const route = String(searchParams.get('route') || '').replace(/^\/+/, '');
  searchParams.delete('route');
  req.url = `${route ? `/${route}` : '/'}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  queueMicrotask(() => {
    if (body) {
      req.emit('data', body);
    }
    req.emit('end');
  });

  return req;
};

const createMockResponse = () => {
  let statusCode = 200;
  const headers = {};
  let body = '';
  let resolveResponse;

  const done = new Promise((resolve) => {
    resolveResponse = resolve;
  });

  return {
    response: {
      get statusCode() {
        return statusCode;
      },
      set statusCode(value) {
        statusCode = value;
      },
      setHeader(name, value) {
        headers[name] = value;
      },
      end(value = '') {
        body = value;
        resolveResponse({
          statusCode,
          headers,
          body,
        });
      },
    },
    done,
  };
};

export const handler = async (event) => {
  const req = createMockRequest(event);
  const { response, done } = createMockResponse();

  await handleAdminApi(req, response);

  return done;
};
