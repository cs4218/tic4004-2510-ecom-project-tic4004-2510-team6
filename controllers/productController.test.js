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

// ===================== getProductController =====================
describe('getProductController', () => {
    // #Test Case 20
  it('returns products', async () => {
    const data = [{ _id: 'p1' }, { _id: 'p2' }];
    const q = chainable(data);
    productModel.find.mockReturnValueOnce(q);

    const res = mockRes();
    await getProductController({}, res);
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      counTotal: 2,
      products: data,
    }));
  });

  it('500 on error (covers catch)', async () => {
    productModel.find.mockImplementationOnce(() => { throw new Error('db'); });
    const res = mockRes();
    await getProductController({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Erorr in getting products',
      error: expect.any(String),
    }));
  });
});

// ===================== getSingleProductController =====================
describe('getSingleProductController', () => {
    // #Test Case 21
  it('returns one product', async () => {
    const q = chainable({ _id: 'p1' });
    productModel.findOne.mockReturnValueOnce(q);

    const res = mockRes();
    await getSingleProductController({ params: { slug: 'slug-toy' } }, res);
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: 'slug-toy' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      product: { _id: 'p1' },
    }));
  });

  it('500 on error', async () => {
    productModel.findOne.mockImplementationOnce(() => { throw new Error('db'); });
    const res = mockRes();
    await getSingleProductController({ params: { slug: 's' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});


// ===================== productFiltersController =====================
describe('productFiltersController', () => {
    // #Test Case 22
  it('filters by category and price', async () => {
    productModel.find.mockResolvedValueOnce([{ _id: 'p1' }]);
    const res = mockRes();
    await productFiltersController({ body: { checked: ['c1', 'c2'], radio: [10, 50] } }, res);
    expect(productModel.find).toHaveBeenCalledWith({ category: ['c1', 'c2'], price: { $gte: 10, $lte: 50 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: [{ _id: 'p1' }] });
  });

  it('400 on error (covers catch)', async () => {
    productModel.find.mockRejectedValueOnce(new Error('db'));
    const res = mockRes();
    await productFiltersController({ body: { checked: [], radio: [] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Error WHile Filtering Products',
      error: expect.any(Error),
    }));
  });
});

// ===================== productCountController =====================
describe('productCountController', () => {
    // #Test Case 23
  it('returns count', async () => {
    const countFn = jest.fn().mockResolvedValue(42);
    productModel.find.mockReturnValueOnce({ estimatedDocumentCount: countFn });
    const res = mockRes();
    await productCountController({}, res);
    expect(countFn).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, total: 42 });
  });

  it('400 on error', async () => {
    productModel.find.mockReturnValueOnce({ estimatedDocumentCount: jest.fn().mockRejectedValue(new Error('db')) });
    const res = mockRes();
    await productCountController({}, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ===================== productListController =====================
describe('productListController', () => {
    // #Test Case 24
  it('lists with pagination', async () => {
    const data = [{ _id: 'p1' }];
    const q = chainable(data);
    productModel.find.mockReturnValueOnce(q);

    const res = mockRes();
    await productListController({ params: { page: 2 } }, res);
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: data });
  });

  it('400 on error', async () => {
    productModel.find.mockImplementationOnce(() => { throw new Error('db'); });
    const res = mockRes();
    await productListController({ params: { page: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ===================== searchProductController =====================
describe('searchProductController', () => {
    // #Test Case 25
  it('returns search results', async () => {
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

  it('400 on error', async () => {
    productModel.find.mockImplementationOnce(() => { throw new Error('db'); });
    const res = mockRes();
    await searchProductController({ params: { keyword: 'toy' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Error In Search Product API',
      error: expect.any(Error),
    }));
  });
});

// ===================== realtedProductController =====================
describe('realtedProductController', () => {
    // #Test Case 26
  it('returns related products', async () => {
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

  it('400 on error', async () => {
    productModel.find.mockImplementationOnce(() => { throw new Error('db'); });
    const res = mockRes();
    await realtedProductController({ params: { pid: 'p1', cid: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ===================== productCategoryController =====================
describe('productCategoryController', () => {
    // #Test Case 27
  it('returns category + products', async () => {
    const cat = { _id: 'c1', slug: 'cat' };
    categoryModel.findOne.mockResolvedValueOnce(cat);
    const q = chainable([{ _id: 'p1' }]);
    productModel.find.mockReturnValueOnce(q);

    const res = mockRes();
    await productCategoryController({ params: { slug: 'cat' } }, res);
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'cat' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: cat,
      products: [{ _id: 'p1' }],
    });
  });

  it('400 on error', async () => {
    categoryModel.findOne.mockRejectedValueOnce(new Error('db'));
    const res = mockRes();
    await productCategoryController({ params: { slug: 'cat' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Error While Getting products',
      error: expect.any(Error),
    }));
  });
});

