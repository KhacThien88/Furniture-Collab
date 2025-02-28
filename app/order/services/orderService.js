// services/orderService.js
const Cart = require("../../cart/models/cartModel");
const Order = require("../models/orderModel");
const cartService = require("../../cart/services/cartService");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");

exports.createOrder = async (userId, paymentMethod, address, transactionId) => {
  try {
    // Lấy các sản phẩm trong giỏ hàng của người dùng
    const cartItems = await Cart.find({ userId }).populate("productId");
    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Tính tổng số tiền
    let totalAmount = 0;
    const items = cartItems.map((item) => {
      const price = item.productId.salePrice || item.productId.price; // Giá của sản phẩm
      totalAmount += price * item.quantity;
      return {
        productId: item.productId._id,
        quantity: item.quantity,
        price,
      };
    });

    // Tạo đơn hàng
    const newOrder = new Order({
      userId,
      items,
      totalAmount,
      address,
      payment: {
        method: paymentMethod,
        transactionId,
        date: new Date(),
      },
      status: "Pending", // Đơn hàng ban đầu có trạng thái là "Pending"
    });

    // Lưu đơn hàng
    await newOrder.save();

    // Xóa giỏ hàng sau khi đã tạo đơn
    await Cart.deleteMany({ userId });

    return newOrder; // Trả về đơn hàng vừa tạo
  } catch (error) {
    throw new Error("Error creating order: " + error.message);
  }
};

exports.getOrderById = async (orderId) => {
  try {
    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("items.productId");
    if (!order) {
      throw new Error("Order not found"); // Ném lỗi nếu không tìm thấy
    }
    return order; // Trả về đơn hàng nếu tìm thấy
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error; // Ném lỗi ra ngoài để controller hoặc handler xử lý
  }
};

exports.getAllOrdersByUserID = async (userId) => {
  try {
    const orders = await Order.find({ userId })
      .populate("userId")
      .populate("items.productId");
    return orders;
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res
      .status(500)
      .json({ success: false, error: "Có lỗi xảy ra, vui lòng thử lại!" });
  }
};

exports.processPayment = async ({ userId, address, paymentMethod }) => {
  try {
    const items = await cartService.getCartByUserId(userId);

    if (!items || items.length === 0) {
      throw new Error("Cart is empty. Cannot place order.");
    }
    if (paymentMethod === "Momo") {
      // Tính toán tổng tiền
      const totalAmount = items.reduce((total, item) => {
        const product = item.productId;
        if (!product || !product.name || !product.price) {
          throw new Error(`Invalid product data for: ${item.productId}`);
        }

        const price = parseFloat(product.salePrice || product.price);
        if (isNaN(price)) {
          throw new Error(`Invalid price for product ${product.name}`);
        }

        return total + price * item.quantity;
      }, 0);

      // Tạo các thông tin cần thiết cho MoMo
      const orderId = `order-${Date.now()}`;
      const requestId = `req-${Date.now()}`;
      const redirectUrl =
        process.env.NODE_ENV === "production"
          ? `${process.env.DOMAIN_HOST}/payment-success`
          : `${process.env.DOMAIN}/payment-success`;
      const ipnUrl =
        process.env.NODE_ENV === "production"
          ? `${process.env.DOMAIN_HOST}/payment-notify`
          : `${process.env.DOMAIN}/payment-notify`;

      const rawSignature =
        `accessKey=${process.env.MOMO_ACCESS_KEY}` +
        `&amount=${Math.round(totalAmount * 2400)}` +
        `&extraData=` +
        `&ipnUrl=${ipnUrl}` +
        `&orderId=${orderId}` +
        `&orderInfo=Thanh toán qua MOMO` +
        `&partnerCode=${process.env.MOMO_PARTNER_CODE}` +
        `&redirectUrl=${redirectUrl}` +
        `&requestId=${requestId}` +
        `&requestType=captureWallet`;

      console.log("Raw Signature:", rawSignature);

      const signature = crypto
        .createHmac("sha256", process.env.MOMO_SECRET_KEY)
        .update(rawSignature)
        .digest("hex");
      console.log(signature);
      const body = {
        partnerCode: process.env.MOMO_PARTNER_CODE,
        partnerName: "VKT",
        accessKey: process.env.MOMO_ACCESS_KEY,
        requestId,
        amount: Math.round(totalAmount * 2400),
        orderId,
        orderInfo: "Thanh toán qua MOMO",
        redirectUrl,
        ipnUrl,
        extraData: "",
        requestType: "captureWallet",
        signature,
        lang: "vi",
      };

      console.log("Body sent to MoMo:", JSON.stringify(body, null, 2));

      // Gửi yêu cầu tới API MoMo
      try {
        const response = await axios.post(
          "https://test-payment.momo.vn/v2/gateway/api/create",
          body
        );

        console.log("Response from MoMo:", response.data);

        if (response.data.resultCode === 0) {
          return response.data.payUrl;
        } else {
          throw new Error(`MoMo API Error: ${response.data.message}`);
        }
      } catch (error) {
        console.error(
          "Error sending request to MoMo:",
          error.response?.data || error.message
        );
        throw new Error(`Error processing MoMo payment: ${error.message}`);
      }
    } else if (paymentMethod === "Stripe") {
      const lineItems = items.map((item) => {
        const product = item.productId;
        const price = parseFloat(product.salePrice || product.price);

        return {
          price_data: {
            currency: "usd",
            product_data: {
              images: [product.images[0]],
              name: product.name,
              description: `Quantity: ${item.quantity}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: item.quantity,
        };
      });

      const domain =
        process.env.NODE_ENV === "production"
          ? process.env.DOMAIN_HOST
          : process.env.DOMAIN;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: lineItems,
        success_url: `${domain}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${domain}/checkout`,
        metadata: {
          address: JSON.stringify(address),
        },
      });

      return session.url;
    } else if (paymentMethod === "VNPay") {
      const totalAmount = items.reduce((total, item) => {
        const product = item.productId;
        if (!product || !product.name || !product.price) {
          throw new Error(`Invalid product data for: ${item.productId}`);
        }
        const price = parseFloat(product.salePrice || product.price);
        return total + price * item.quantity;
      }, 0);

      const totalAmountInVND = Math.round(totalAmount * 24000); // Chuyển sang VND
      console.log("Total Amount in VND:", totalAmountInVND);

      const vnp_TmnCode = process.env.VNPAY_TMN_CODE;
      const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
      const vnp_Url = process.env.VNPAY_URL;
      const returnUrl =
        process.env.NODE_ENV === "production"
          ? `${process.env.DOMAIN_HOST}/payment-success`
          : `${process.env.DOMAIN}/payment-success`;

      const vnp_Params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: vnp_TmnCode,
        vnp_Amount: totalAmountInVND * 100, // Chuyển sang đơn vị VNPay yêu cầu
        vnp_CurrCode: "VND",
        vnp_TxnRef: `order-${Date.now()}`,
        vnp_OrderInfo: "Payment",
        vnp_OrderType: "billpayment",
        vnp_Locale: "vn",
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: "127.0.0.1",
        vnp_CreateDate: new Date()
          .toISOString()
          .replace(/-|:|T|Z/g, "")
          .slice(0, 14), // Định dạng YYYYMMDDHHmmss
      };

      // Sắp xếp tham số
      const sortedParams = Object.keys(vnp_Params)
        .sort()
        .reduce((acc, key) => {
          acc[key] = vnp_Params[key];
          return acc;
        }, {});

      console.log("Sorted Parameters:", sortedParams);

      // Tạo query string không mã hóa
      const queryString = Object.entries(sortedParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      console.log("Query String for Signature:", queryString);

      // Tạo chữ ký
      const secureHash = crypto
        .createHmac("sha512", vnp_HashSecret)
        .update(queryString)
        .digest("hex");
      console.log("Generated Secure Hash:", secureHash);

      // Tạo URL thanh toán
      const paymentUrl = `${vnp_Url}?${queryString}&vnp_SecureHash=${secureHash}`;
      console.log("VNPay Payment URL:", paymentUrl);

      return paymentUrl;
    } else {
      throw new Error("Unsupported payment method.");
    }
  } catch (error) {
    console.error("Error in processPayment:", error);
    throw error;
  }
};
