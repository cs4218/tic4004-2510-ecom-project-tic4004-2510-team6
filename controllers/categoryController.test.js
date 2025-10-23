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


// ===================== categoryControlller (get all) =====================
describe('categoryControlller (list all)', () => {
    // #Test Case 19
  it('200 success returns categories', async () => {
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

  it('500 on error', async () => {
    categoryModel.find.mockRejectedValueOnce(new Error('nope'));
    const res = mockRes();

    await categoryControlller({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(Error),
        message: 'Error while getting all categories',
      })
    );
  });
});
