import {
  categoryControlller,
} from './categoryController.js';

import categoryModel from '../models/categoryModel.js';
import slugify from 'slugify';

// ------------------ Helpers ------------------
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send   = jest.fn().mockReturnValue(res);
  return res;
};

// ------------------ Mocks ------------------
jest.mock('../models/categoryModel.js', () => {
  const ctor = jest.fn();
  ctor.findOne = jest.fn();
  ctor.find = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  ctor.findByIdAndDelete = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock('slugify', () => ({
  __esModule: true,
  default: jest.fn((name) => `slug-of-${String(name).toLowerCase()}`),
}));

beforeEach(() => {
  jest.clearAllMocks();
});


describe('categoryControlller (list all)', () => {
  
  it('#Test Case 16: returns categories on success', async () => {
    categoryModel.find.mockResolvedValueOnce([{ _id: 'c1' }, { _id: 'c2' }]);
    const req = {};
    const res = mockRes();

    await categoryControlller(req, res);

    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'All Categories List',
      category: [{ _id: 'c1' }, { _id: 'c2' }],
    });
  });
});
