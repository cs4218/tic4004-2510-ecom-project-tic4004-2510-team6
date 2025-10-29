import {
  getProductController,
  getSingleProductController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  realtedProductController,
  productCategoryController,
} from './productController.js';

import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';

// ------------------ Helpers ------------------
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send   = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.set    = jest.fn().mockReturnValue(res);
  return res;
};

// “Thenable + chainable” query mock for Mongoose chains
const chainable = (data) => {
  const q = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    then: (resolve) => resolve(data),
    catch: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(data),
  };
  return q;
};

// ------------------ Mocks ------------------
jest.mock('../models/productModel.js', () => {
  const ctor = jest.fn(); 
  ctor.find = jest.fn();
  ctor.findOne = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndDelete = jest.fn(() => ({ select: jest.fn().mockResolvedValue({}) }));
  ctor.findByIdAndUpdate = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock('../models/categoryModel.js', () => {
  const m = { findOne: jest.fn() };
  return { __esModule: true, default: m };
});

jest.mock('../models/orderModel.js', () => {
  const ctor = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock('fs', () => ({
  __esModule: true,
  default: {},
  readFileSync: jest.fn(() => Buffer.from('img')),
}));

jest.mock('slugify', () => ({
  __esModule: true,
  default: jest.fn((s) => `slug-${String(s).toLowerCase()}`),
}));


beforeEach(() => {
  jest.clearAllMocks();
});

describe('productFiltersController', () => {
   
  it('#Test Case 17: filters by category and price', async () => {
    productModel.find.mockResolvedValueOnce([{ _id: 'p1' }]);
    const res = mockRes();
    await productFiltersController({ body: { checked: ['c1', 'c2'], radio: [10, 50] } }, res);
    expect(productModel.find).toHaveBeenCalledWith({ category: ['c1', 'c2'], price: { $gte: 10, $lte: 50 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: [{ _id: 'p1' }] });
  });
});


describe('productListController', () => {
  it('#Test Case 18: lists with pagination', async () => {
    const data = [{ _id: 'p1' }];
    const q = chainable(data);
    productModel.find.mockReturnValueOnce(q);

    const res = mockRes();
    await productListController({ params: { page: 2 } }, res);
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: data });
  });
});


describe('searchProductController', () => {
  
  it('#Test Case 19: returns products found on search', async () => {
    const data = [{ _id: 'p1' }];
    const q = chainable(data);
    productModel.find.mockReturnValueOnce(q);

    const res = mockRes();
    await searchProductController({ params: { keyword: 'toy' } }, res);
    expect(productModel.find).toHaveBeenCalledWith(expect.objectContaining({
      $or: expect.any(Array),
    }));
    expect(res.json).toHaveBeenCalledWith(data);
  });
});


describe('realtedProductController', () => {
  
  it('#Test Case 20: returns related products', async () => {
    const data = [{ _id: 'p2' }];
    const q = chainable(data);
    productModel.find.mockReturnValueOnce(q);

    const res = mockRes();
    await realtedProductController({ params: { pid: 'p1', cid: 'c1' } }, res);
    expect(productModel.find).toHaveBeenCalledWith(expect.objectContaining({
      category: 'c1',
      _id: { $ne: 'p1' },
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: data });
  }); 
});
