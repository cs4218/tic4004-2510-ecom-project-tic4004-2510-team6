import {
  registerController,
  loginController,
  forgotPasswordController,
  testController,
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "./authController.js";

import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

// ---------- helpers ----------
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeChainableQuery = (data) => {
  // supports .populate().populate().sort() and awaiting/then
  const q = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    then: (resolve) => resolve(data),
    catch: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(data),
    // Allow awaiting directly
    [Symbol.toStringTag]: "Promise",
  };
  return q;
};

// ---------- module mocks ----------
jest.mock("../models/userModel.js", () => {
  const ctor = jest.fn(); // will be used as `new userModel(...)`
  ctor.findOne = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  return { __esModule: true, default: ctor };
});

jest.mock("../models/orderModel.js", () => {
  const m = {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  return { __esModule: true, default: m };
});

jest.mock("../helpers/authHelper.js", () => ({
  __esModule: true,
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: { sign: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ===================== registerController =====================
describe("registerController", () => {
  const baseBody = {
    name: "JJ",
    email: "jj@example.com",
    password: "pw123456",
    phone: "12345678",
    address: "SG",
    answer: "blue",
  };

  const testMissing = async (omitKey, expectedFieldText) => {
    const body = { ...baseBody };
    delete body[omitKey];
    const req = { body };
    const res = mockRes();
    await registerController(req, res);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        [omitKey === "name" ? "error" : "message"]: expect.stringContaining(
          expectedFieldText
        ),
      })
    );
  };

  it("returns error when name missing", async () => {
    await testMissing("name", "Name is Required");
  });
  it("returns error when email missing", async () => {
    await testMissing("email", "Email is Required");
  });
  it("returns error when password missing", async () => {
    await testMissing("password", "Password is Required");
  });
  it("returns error when phone missing", async () => {
    await testMissing("phone", "Phone no is Required");
  });
  it("returns error when address missing", async () => {
    await testMissing("address", "Address is Required");
  });
  it("returns error when answer missing", async () => {
    await testMissing("answer", "Answer is Required");
  });

  it("returns 200 with success:false when user already exists", async () => {
    userModel.findOne.mockResolvedValueOnce({ _id: "u1" });
    const req = { body: baseBody };
    const res = mockRes();
    await registerController(req, res);
    expect(userModel.findOne).toHaveBeenCalledWith({ email: baseBody.email });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Already Register please login",
      })
    );
  });

  it("creates user and returns 201 on success", async () => {
    userModel.findOne.mockResolvedValueOnce(null);
    hashPassword.mockResolvedValueOnce("hashedPw");
    // make `new userModel(...).save()`
    const saveMock = jest.fn().mockResolvedValue({
      _id: "u2",
      name: baseBody.name,
      email: baseBody.email,
    });
    userModel.mockImplementationOnce(() => ({ save: saveMock }));

    const req = { body: baseBody };
    const res = mockRes();
    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledWith(baseBody.password);
    expect(saveMock).toHaveBeenCalledWith();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "User Register Successfully",
        user: expect.objectContaining({ _id: "u2", email: baseBody.email }),
      })
    );
  });

  it("returns 500 on unexpected error", async () => {
    userModel.findOne.mockRejectedValueOnce(new Error("DB down"));
    const req = { body: baseBody };
    const res = mockRes();
    await registerController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Errro in Registeration",
      })
    );
  });
});

// ===================== loginController =====================
describe("loginController", () => {
  it("returns 404 when email or password missing", async () => {
    const res = mockRes();
    await loginController({ body: { email: "a@b.com" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it("returns 404 when user not found", async () => {
    userModel.findOne.mockResolvedValueOnce(null);
    const res = mockRes();
    await loginController(
      { body: { email: "a@b.com", password: "x" } },
      res
    );
    expect(userModel.findOne).toHaveBeenCalledWith({ email: "a@b.com" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Email is not registerd" })
    );
  });

  it("returns 200 with success:false on invalid password", async () => {
    userModel.findOne.mockResolvedValueOnce({ _id: "u1", password: "hpw" });
    comparePassword.mockResolvedValueOnce(false);
    const res = mockRes();
    await loginController(
      { body: { email: "a@b.com", password: "bad" } },
      res
    );
    expect(comparePassword).toHaveBeenCalledWith("bad", "hpw");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Invalid Password" })
    );
  });

  it("returns 200 with token on success", async () => {
    process.env.JWT_SECRET = "secret";
    const user = {
      _id: "u1",
      name: "JJ",
      email: "a@b.com",
      phone: "1",
      address: "SG",
      role: 0,
      password: "hpw",
    };
    userModel.findOne.mockResolvedValueOnce(user);
    comparePassword.mockResolvedValueOnce(true);
    JWT.sign.mockReturnValueOnce("token123");

    const res = mockRes();
    await loginController(
      { body: { email: "a@b.com", password: "ok" } },
      res
    );

    expect(JWT.sign).toHaveBeenCalledWith({ _id: "u1" }, "secret", {
      expiresIn: "7d",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: "token123",
        user: expect.objectContaining({
          _id: "u1",
          email: "a@b.com",
          name: "JJ",
        }),
      })
    );
  });

  it("returns 500 on error", async () => {
    userModel.findOne.mockRejectedValueOnce(new Error("DB err"));
    const res = mockRes();
    await loginController(
      { body: { email: "a@b.com", password: "x" } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error in login" })
    );
  });
});

// ===================== forgotPasswordController =====================
describe("forgotPasswordController", () => {
  it("400 when email missing", async () => {
    const res = mockRes();
    await forgotPasswordController(
      { body: { answer: "A", newPassword: "x" } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Emai is required" })
    );
  });

  it("400 when answer missing", async () => {
    const res = mockRes();
    await forgotPasswordController(
      { body: { email: "a@b.com", newPassword: "x" } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "answer is required" })
    );
  });

  it("400 when newPassword missing", async () => {
    const res = mockRes();
    await forgotPasswordController(
      { body: { email: "a@b.com", answer: "A" } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "New Password is required" })
    );
  });

  it("404 when wrong email/answer", async () => {
    userModel.findOne.mockResolvedValueOnce(null);
    const res = mockRes();
    await forgotPasswordController(
      { body: { email: "a@b.com", answer: "bad", newPassword: "x" } },
      res
    );
    expect(userModel.findOne).toHaveBeenCalledWith({
      email: "a@b.com",
      answer: "bad",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Wrong Email Or Answer" })
    );
  });

  it("200 on success and updates password", async () => {
    userModel.findOne.mockResolvedValueOnce({ _id: "u1" });
    hashPassword.mockResolvedValueOnce("HASH");
    userModel.findByIdAndUpdate.mockResolvedValueOnce({});
    const res = mockRes();
    await forgotPasswordController(
      { body: { email: "a@b.com", answer: "A", newPassword: "newpw" } },
      res
    );
    expect(hashPassword).toHaveBeenCalledWith("newpw");
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("u1", {
      password: "HASH",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("500 on error", async () => {
    userModel.findOne.mockRejectedValueOnce(new Error("boom"));
    const res = mockRes();
    await forgotPasswordController(
      { body: { email: "a@b.com", answer: "A", newPassword: "x" } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Something went wrong" })
    );
  });
});

// ===================== testController =====================
describe("testController", () => {
  it('sends "Protected Routes"', () => {
    const res = mockRes();
    testController({}, res);
    expect(res.send).toHaveBeenCalledWith("Protected Routes");
  });

  it("handles error branch", () => {
    const res = mockRes();
    // silence console during test
    jest.spyOn(console, 'log').mockImplementation(() => {});
    // Make the FIRST call to res.send throw; subsequent calls use default mock (return res)
    res.send.mockImplementationOnce(() => { throw new Error('boom'); });

    testController({}, res);

    expect(console.log).toHaveBeenCalledWith(expect.any(Error));     // covers console.log(error)
    expect(res.send).toHaveBeenCalledTimes(2);                       // 1st throws, 2nd from catch
    expect(res.send).toHaveBeenLastCalledWith(
        expect.objectContaining({ error: expect.any(Error) })          // covers res.send({ error })
    );
  });
});

// ===================== updateProfileController =====================
describe("updateProfileController", () => {
  it("rejects short password (<6)", async () => {
    const res = mockRes();
    await updateProfileController(
      { body: { password: "123" }, user: { _id: "u1" } },
      res
    );
    expect(res.json).toHaveBeenCalledWith({
      error: "Passsword is required and 6 character long",
    });
  });

  it("updates without password", async () => {
    userModel.findById.mockResolvedValueOnce({
      name: "Old",
      phone: "111",
      address: "SG",
      password: "keep",
    });
    userModel.findByIdAndUpdate.mockResolvedValueOnce({
      _id: "u1",
      name: "New",
    });
    const res = mockRes();
    await updateProfileController(
      { body: { name: "New" }, user: { _id: "u1" } },
      res
    );
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ name: "New", password: "keep" }),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Profile Updated SUccessfully",
      })
    );
  });

  it("updates with password (hashed)", async () => {
    userModel.findById.mockResolvedValueOnce({
      name: "Old",
      phone: "111",
      address: "SG",
      password: "keep",
    });
    hashPassword.mockResolvedValueOnce("HNEW");
    userModel.findByIdAndUpdate.mockResolvedValueOnce({ _id: "u1" });

    const res = mockRes();
    await updateProfileController(
      { body: { password: "123456" }, user: { _id: "u1" } },
      res
    );
    expect(hashPassword).toHaveBeenCalledWith("123456");
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ password: "HNEW" }),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 on error", async () => {
    userModel.findById.mockRejectedValueOnce(new Error("boom"));
    const res = mockRes();
    await updateProfileController({ body: {}, user: { _id: "u1" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error WHile Update profile" })
    );
  });
});

// ===================== getOrdersController =====================
describe("getOrdersController", () => {
  it("returns orders json (chainable query)", async () => {
    const orders = [{ _id: "o1" }];
    const q = makeChainableQuery(orders);
    // make populate chain work:
    q.populate = jest.fn().mockReturnValue(q);
    orderModel.find.mockReturnValueOnce(q);

    const res = mockRes();
    await getOrdersController({ user: { _id: "u1" } }, res);
    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "u1" });
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("returns 500 on error", async () => {
    orderModel.find.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = mockRes();
    await getOrdersController({ user: { _id: "u1" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error WHile Geting Orders" })
    );
  });
});

// ===================== getAllOrdersController =====================
describe("getAllOrdersController", () => {
  it("returns all orders sorted", async () => {
    const orders = [{ _id: "o1" }, { _id: "o2" }];
    const q = makeChainableQuery(orders);
    q.populate = jest.fn().mockReturnValue(q);
    q.sort = jest.fn().mockReturnValue(q);
    orderModel.find.mockReturnValueOnce(q);

    const res = mockRes();
    await getAllOrdersController({}, res);
    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("returns 500 on error", async () => {
    orderModel.find.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = mockRes();
    await getAllOrdersController({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error WHile Geting Orders" })
    );
  });
});

// ===================== orderStatusController =====================
describe("orderStatusController", () => {
  it("updates status and returns updated order", async () => {
    const updated = { _id: "o1", status: "shipped" };
    orderModel.findByIdAndUpdate.mockResolvedValueOnce(updated);

    const res = mockRes();
    await orderStatusController(
      { params: { orderId: "o1" }, body: { status: "shipped" } },
      res
    );

    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "o1",
      { status: "shipped" },
      { new: true }
    );
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it("returns 500 on error", async () => {
    orderModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("db"));
    const res = mockRes();
    await orderStatusController(
      { params: { orderId: "o1" }, body: { status: "shipped" } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error While Updateing Order" })
    );
  });
});
