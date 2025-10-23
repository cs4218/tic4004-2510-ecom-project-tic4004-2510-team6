import {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryCOntroller,
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

// ===================== createCategoryController =====================
describe('createCategoryController', () => {
  it('401 when name missing', async () => {
    const req = { body: {} };
    const res = mockRes();
    await createCategoryController(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ message: 'Name is required' });
  });

  it('200 when category already exists', async () => {
    categoryModel.findOne.mockResolvedValueOnce({ _id: 'c1', name: 'Books' });
    const req = { body: { name: 'Books' } };
    const res = mockRes();
    await createCategoryController(req, res);
    expect(categoryModel.findOne).toHaveBeenCalledWith({ name: 'Books' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Category Already Exisits',
    });
  });

  it('201 create success (uses slugify + save)', async () => {
    categoryModel.findOne.mockResolvedValueOnce(null);
    const save = jest.fn().mockResolvedValue({
      _id: 'c2',
      name: 'Toys',
      slug: 'slug-of-toys',
    });
    // new categoryModel(...) → { save }
    categoryModel.mockImplementationOnce(() => ({ save }));

    const req = { body: { name: 'Toys' } };
    const res = mockRes();

    await createCategoryController(req, res);

    expect(slugify).toHaveBeenCalledWith('Toys');
    expect(save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'new category created',
      category: expect.objectContaining({ _id: 'c2', name: 'Toys' }),
    });
  });


  it('returns 500 on unexpected error', async () => {
    categoryModel.findOne.mockRejectedValueOnce(new Error('Database down'));

    const req = { body: { name: 'ErrorCat' } };
    const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    };
    jest.spyOn(console, 'log').mockImplementation(() => {}); // prevent noisy log

    await createCategoryController(req, res);

    expect(console.log).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
        success: false,
        message: 'Error in Category',
        error: expect.any(Error),
        })
    );
    });

});

// ===================== updateCategoryController =====================
describe('updateCategoryController', () => {
  it('200 success and returns updated category', async () => {
    categoryModel.findByIdAndUpdate.mockResolvedValueOnce({
      _id: 'c3',
      name: 'Gadgets',
      slug: 'slug-of-gadgets',
    });

    const req = { params: { id: 'c3' }, body: { name: 'Gadgets' } };
    const res = mockRes();

    await updateCategoryController(req, res);

    expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'c3',
      { name: 'Gadgets', slug: 'slug-of-gadgets' },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      messsage: 'Category Updated Successfully',
      category: expect.objectContaining({ _id: 'c3', name: 'Gadgets' }),
    });
  });

  it('500 on error', async () => {
    categoryModel.findByIdAndUpdate.mockRejectedValueOnce(new Error('DB err'));
    const req = { params: { id: 'c3' }, body: { name: 'NewName' } };
    const res = mockRes();

    await updateCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(Error),
        message: 'Error while updating category',
      })
    );
  });
});

// ===================== categoryControlller (get all) =====================
describe('categoryControlller (list all)', () => {
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

// ===================== singleCategoryController =====================
describe('singleCategoryController', () => {
  it('200 success returns single category by slug', async () => {
    categoryModel.findOne.mockResolvedValueOnce({ _id: 'c9', slug: 'slug-of-music' });
    const req = { params: { slug: 'slug-of-music' } };
    const res = mockRes();

    await singleCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'slug-of-music' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Get SIngle Category SUccessfully',
      category: expect.objectContaining({ _id: 'c9' }),
    });
  });

  it('500 on error', async () => {
    categoryModel.findOne.mockRejectedValueOnce(new Error('boom'));
    const res = mockRes();

    await singleCategoryController({ params: { slug: 'any' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(Error),
        message: 'Error While getting Single Category',
      })
    );
  });
});

// ===================== deleteCategoryCOntroller =====================
describe('deleteCategoryCOntroller', () => {
  it('200 success after delete', async () => {
    categoryModel.findByIdAndDelete.mockResolvedValueOnce({ _id: 'c7' });

    const req = { params: { id: 'c7' } };
    const res = mockRes();

    await deleteCategoryCOntroller(req, res);

    expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith('c7');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Categry Deleted Successfully',
    });
  });

  it('500 on error', async () => {
    categoryModel.findByIdAndDelete.mockRejectedValueOnce(new Error('del err'));
    const res = mockRes();

    await deleteCategoryCOntroller({ params: { id: 'c7' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'error while deleting category',
        error: expect.any(Error),
      })
    );
  });
});
