/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/services/api', () => ({
  getProducts: jest.fn().mockResolvedValue([]),
  getSellerProducts: jest.fn().mockResolvedValue([]),
  getCategories: jest.fn().mockResolvedValue([]),
  getOrders: jest.fn().mockResolvedValue([]),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  loginUser: jest.fn(),
  registerUser: jest.fn(),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
