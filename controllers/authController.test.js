import {
  registerController,
  loginController,
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

  it("#Test Case 1: returns error when email missing", async () => {
    await testMissing("email", "Email is Required");
  });
  
  // === Boundary Value Analysis for password ===
  it("#Test Case 2: rejects short password (<6)", async () => {
    const req = {
      body: { ...baseBody, password: "123" },
    };
    const res = mockRes();
    await registerController(req, res);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Errro in Registeration"),
      })
    );
  });

  it("#Test Case 3: accepts password length (=6)", async () => {
    userModel.findOne.mockResolvedValueOnce(null);
    hashPassword.mockResolvedValueOnce("H6");
    const saveMock = jest.fn().mockResolvedValue({
      _id: "u1",
      name: baseBody.name,
      email: baseBody.email,
    });
    userModel.mockImplementationOnce(() => ({ save: saveMock }));

    const req = { body: { ...baseBody, password: "123456" } };
    const res = mockRes();
    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("123456");
    expect(userModel.findOne).toHaveBeenCalledWith({ email: baseBody.email });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: expect.objectContaining({ _id: "u1", email: baseBody.email }),
      })
    );
  });

  it("#Test Case 4: accepts password length >6", async () => {
    userModel.findOne.mockResolvedValueOnce(null);
    hashPassword.mockResolvedValueOnce("Hvalid");
    const saveMock = jest.fn().mockResolvedValue({
      _id: "u2",
      name: baseBody.name,
      email: baseBody.email,
    });
    userModel.mockImplementationOnce(() => ({ save: saveMock }));

    const req = { body: { ...baseBody, password: "abcdefgh" } };
    const res = mockRes();
    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("abcdefgh");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "User Register Successfully",
      })
    );
  });

  // === Combinatorial: email uniqueness independent of other fields ===
  it("#Test Case 5: returns 200 already-registered even if other fields differ (email is dominant)", async () => {
    userModel.findOne.mockResolvedValueOnce({ _id: "u1" });
    const req = {
        body: {
        name: "Other Name",
        email: "jj@example.com", // same email
        password: "different",
        phone: "99999999",
        address: "Other",
        answer: "green",
        },
    };
    const res = mockRes();

    await registerController(req, res);

    expect(userModel.findOne).toHaveBeenCalledWith({ email: "jj@example.com" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
        success: false,
        message: "Already Register please login",
        })
    );
    });

    it("#Test Case 6: creates user and returns 201 on success", async () => {
    userModel.findOne.mockResolvedValueOnce(null);
    hashPassword.mockResolvedValueOnce("hashedPw");
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

  it("#Test Case 7: returns 500 on unexpected error", async () => {
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


describe("loginController", () => {
  it("#Test Case 8: returns 404 when email present & password missing", async () => {
    const res = mockRes();
    await loginController({ body: { email: "a@b.com" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Invalid email or password" })
    );
    });
  it("returns 404 when password present & email missing", async () => {
    const res = mockRes();
    await loginController({ body: { password: "secret" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Invalid email or password" })
    );
    });

  it("#Test Case 9: returns 404 when user not found", async () => {
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

  it("#Test Case 10: returns 200 with token on success", async () => {
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

});

describe("updateProfileController", () => { 

  it("#Test Case 11: updates without password", async () => {
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
 
  it("#Test Case 12: updates with password (hashed)", async () => {
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

  it("#Test Case 13: returns 400 error on updating profile", async () => {
    userModel.findById.mockRejectedValueOnce(new Error("boom"));
    const res = mockRes();
    await updateProfileController({ body: {}, user: { _id: "u1" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error While Update profile" })
    );
  });
});


describe("getAllOrdersController", () => {
  
  it("#Test Case 14: returns all orders", async () => {
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

  // it("returns 500 on error", async () => {
  //   orderModel.find.mockImplementationOnce(() => {
  //     throw new Error("db");
  //   });
  //   const res = mockRes();
  //   await getAllOrdersController({}, res);
  //   expect(res.status).toHaveBeenCalledWith(500);
  //   expect(res.send).toHaveBeenCalledWith(
  //     expect.objectContaining({ message: "Error WHile Geting Orders" })
  //   );
  // });
});


describe("orderStatusController", () => {
  
  it("#Test Case 15: updates status and returns updated order", async () => {
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

  // it("returns 500 on error", async () => {
  //   orderModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("db"));
  //   const res = mockRes();
  //   await orderStatusController(
  //     { params: { orderId: "o1" }, body: { status: "shipped" } },
  //     res
  //   );
  //   expect(res.status).toHaveBeenCalledWith(500);
  //   expect(res.send).toHaveBeenCalledWith(
  //     expect.objectContaining({ message: "Error While Updateing Order" })
  //   );
  // });
});
