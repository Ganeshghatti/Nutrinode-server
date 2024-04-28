const express = require("express");
const router = express.Router();
const {
  register,
  login,
  ForgotPassword,
  ResetPassword,
  MyAccount,
  EditAccount,
  AddToDiet,
  GetDiet,
  DetectFood,
  Chat
} = require("../Controller/User");
const requireAuth = require("../middleware/User");

router.route("/user/register").post(register);
router.route("/user/login").post(login);
router.route("/user/my-account").get(MyAccount);
router.route("/user/my-account").put(EditAccount);
router.route("/user/add-to-diet").post(AddToDiet);
router.route("/user/detect-food").post(DetectFood);
router.route("/user/chat").post(Chat);
router.route("/user/get-diet").get(GetDiet);
router.route("/user/forgot-password").post(ForgotPassword)
router.route("/user/reset-password/:resetPasswordToken").post(ResetPassword);

module.exports = router;
