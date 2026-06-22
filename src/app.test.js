const request = require('supertest');
const { app, server } = require('../src/app');

afterAll((done) => {
  server.close(done);
});

describe('GET /', () => {
  it('should return 200 and a greeting message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Hello');
  });
});

describe('GET /health', () => {
  it('should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

describe('GET /info', () => {
  it('should return system info', async () => {
    const res = await request(app).get('/info');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('node');
    expect(res.body).toHaveProperty('platform');
  });
});

describe('GET /unknown', () => {
  it('should return 404', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.statusCode).toBe(404);
  });
});