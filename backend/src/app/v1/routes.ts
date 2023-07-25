import { celebrate } from "celebrate";
import express, { Request, Response } from "express";

import * as controllers from "./controllers";
import * as middlewares from "./middlewares";
import { validator } from "./schemaValidator";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => {
  return res.status(200).send("OK!");
});

router.post("/register", celebrate(validator.registerSms, { allowUnknown: true }), middlewares.verifyRegistration, controllers.register);
router.post(
  "/start",
  celebrate(validator.passwordlessStart, { allowUnknown: true }),
  middlewares.checkAndAddPhoneNumber,
  controllers.initiatePasswordless
);
router.post("/verify", celebrate(validator.verifySms, { allowUnknown: true }), middlewares.checkAndAddPhoneNumber, controllers.verify);

router.post(
  "/authenticator/register",
  celebrate(validator.registerAuthenticator, { allowUnknown: true }),
  middlewares.verifyAuthenticatorRegistration,
  controllers.registerAuthenticator
);

router.post(
  "/authenticator/verify",
  celebrate(validator.verifyAuthenticator, { allowUnknown: true }),
  middlewares.checkAndAddSecretkey,
  controllers.verifyAuthenticator
);

export default router;
