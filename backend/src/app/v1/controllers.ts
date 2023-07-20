import { Request, Response } from "express";

import { knexRead, knexWrite } from "../../database/knex";
import { ADDRESS_NUMBER_DATA, NUMBER_VERIFIED_STATUS } from "../../utils/constants";
import createLogger from "../../utils/createLogger";
import { IRegisterRequestBody, IVerifyPasswordlessBody } from "../../utils/interfaces";
import SmsPasswordless from "../modules/smsPasswordless";

const log = createLogger("controllers.ts");

export const register = async (req: Request, res: Response) => {
  try {
    const { pubKey, number } = req.body as IRegisterRequestBody;
    // this is a one time operation per address if the number is verified.

    // check if the address is already present in the database.
    const address = `${pubKey.x}${pubKey.y}`;
    const result = await knexRead(ADDRESS_NUMBER_DATA).where({ address }).first();
    if (result && result.status === NUMBER_VERIFIED_STATUS.success) {
      return res.status(200).json({
        registered: true,
      });
    }

    if (result) {
      await knexWrite(ADDRESS_NUMBER_DATA).where({ address }).update({ number });
    } else {
      const payload = {
        address,
        number,
        status: NUMBER_VERIFIED_STATUS.PENDING,
      };
      await knexWrite(ADDRESS_NUMBER_DATA).insert(payload);
    }
    return res.status(200).json({ success: true, message: "Registered" });
  } catch (error: unknown) {
    log.error("error initializing register", error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const initiatePasswordless = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.params;
    const result = await SmsPasswordless.initiate({
      number: phoneNumber,
    });
    if (result.success) {
      return res.status(200).json(result);
    }

    return res.status(500).json({ success: false });
  } catch (error: unknown) {
    log.error("error initializing passwordless flow", error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const verify = async (req: Request, res: Response) => {
  try {
    const { code, data, address } = req.body as IVerifyPasswordlessBody;

    // this is added from the middleware.
    const { phoneNumber, status } = req.params;
    const result = await SmsPasswordless.verify({
      number: phoneNumber,
      code,
    });

    if (result) {
      // the user has successfully been verified here.
      const updatePayload: Record<string, string> = {};
      if (status === NUMBER_VERIFIED_STATUS.PENDING) updatePayload.status = NUMBER_VERIFIED_STATUS.success;
      if (data) updatePayload.data = JSON.stringify(data);

      // check if we need to update something or not.
      if (Object.keys(updatePayload).length > 0) {
        await knexWrite(ADDRESS_NUMBER_DATA).where({ address }).update(updatePayload);
      }

      const savedData = await knexWrite(ADDRESS_NUMBER_DATA).where({ address }).first();
      return res.status(200).json({ data: JSON.parse(savedData.data || "{}") });
    }

    return res.status(500).json({ success: false });
  } catch (error: unknown) {
    log.error("error verifying passwordless flow", error);
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
};
