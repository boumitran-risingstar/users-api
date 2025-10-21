const request = require('supertest');
const app = require('./index');

// Mock the Firestore module
jest.mock('@google-cloud/firestore', () => {
  const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    runTransaction: jest.fn(),
  };
  return { Firestore: jest.fn(() => mockFirestore) };
});

const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();

describe('Users API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- PUT /users ---
  describe('PUT /users', () => {
    it('should create a new user', async () => {
      firestore.get.mockResolvedValueOnce({ exists: false });
      firestore.runTransaction.mockImplementationOnce(async (updateFunction) => {
        await updateFunction({ get: () => ({ exists: false }), set: () => {} });
      });

      const res = await request(app)
        .put('/users')
        .send({ name: 'Test User', email: 'test@example.com', uid: '123' });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id', '123');
      expect(res.body).toHaveProperty('slugURL', 'test-user');
    });

    it('should return 200 if user already exists', async () => {
      firestore.get.mockResolvedValueOnce({ exists: true });

      const res = await request(app)
        .put('/users')
        .send({ name: 'Test User', email: 'test@example.com', uid: '123' });

      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual('Document already exists.');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .put('/users')
        .send({ name: 'Te', email: 'test' });

      expect(res.statusCode).toEqual(400);
    });
  });

  // --- GET /users/:uid ---
  describe('GET /users/:uid', () => {
    it('should get a user by uid', async () => {
      const userData = { name: 'Test User', email: 'test@example.com' };
      firestore.get.mockResolvedValueOnce({ exists: true, data: () => userData, id: '123' });

      const res = await request(app).get('/users/123');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ id: '123', ...userData });
    });

    it('should return 404 if user not found', async () => {
      firestore.get.mockResolvedValueOnce({ exists: false });

      const res = await request(app).get('/users/123');

      expect(res.statusCode).toEqual(404);
    });
  });

   // --- PATCH /users/:uid ---
   describe('PATCH /users/:uid', () => {
    it('should update a user', async () => {
      firestore.get.mockResolvedValueOnce({ exists: true });
      firestore.update.mockResolvedValueOnce();

      const res = await request(app)
        .patch('/users/123')
        .send({ name: 'Updated User' });

      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual('User updated');
    });

    it('should return 404 if user not found', async () => {
      firestore.get.mockResolvedValueOnce({ exists: false });

      const res = await request(app)
        .patch('/users/123')
        .send({ name: 'Updated User' });

      expect(res.statusCode).toEqual(404);
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .patch('/users/123')
        .send({ name: 'U' });

      expect(res.statusCode).toEqual(400);
    });
  });

  // --- DELETE /users/:uid ---
  describe('DELETE /users/:uid', () => {
    it('should delete a user', async () => {
      firestore.get.mockResolvedValueOnce({ exists: true });
      firestore.delete.mockResolvedValueOnce();

      const res = await request(app).delete('/users/123');

      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual('User deleted');
    });

    it('should return 404 if user not found', async () => {
      firestore.get.mockResolvedValueOnce({ exists: false });

      const res = await request(app).delete('/users/123');

      expect(res.statusCode).toEqual(404);
    });
  });
});
