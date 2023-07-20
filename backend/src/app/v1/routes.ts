import { celebrate } from "celebrate";
import express, { Request, Response } from "express";

import * as controllers from "./controllers";
import * as middlewares from "./middlewares";
import { validator } from "./schemaValidator";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => {
  return res.status(200).send("OK!");
});

router.post("/register", celebrate(validator.register, { allowUnknown: true }), middlewares.verifyRegistration, controllers.register);
router.post(
  "/start",
  celebrate(validator.passwordlessStart, { allowUnknown: true }),
  middlewares.checkAndAddPhoneNumber,
  controllers.initiatePasswordless
);
router.post("/verify", celebrate(validator.verify, { allowUnknown: true }), middlewares.checkAndAddPhoneNumber, controllers.verify);

export default router;
