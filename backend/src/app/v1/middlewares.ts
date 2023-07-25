/* eslint-disable require-atomic-updates */
import { NextFunction, Request, Response } from "express";
import keccak256 from "keccak256";

import { knexRead } from "../../database/knex";
import { getEcCrypto } from "../../utils";
import { ADDRESS_AUTHENTICATOR_DATA, ADDRESS_NUMBER_DATA } from "../../utils/constants";
import { IAuthenticatorRegisterRequestBody, IRegisterRequestBody } from "../../utils/interfaces";

export const verifyRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { sig, number, pubKey } = req.body as IRegisterRequestBody;
  const ec = getEcCrypto();
  const result = ec.verify(keccak256(number), sig, ec.keyFromPublic(pubKey));

  if (!result) {
    return res.status(400).json({ code: "InvalidSignature", message: "Invalid sig" });
  }

  next();
};

export const verifyAuthenticatorRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { sig, secretKey, pubKey } = req.body as IAuthenticatorRegisterRequestBody;
  const ec = getEcCrypto();
  const result = ec.verify(keccak256(secretKey), sig, ec.keyFromPublic(pubKey));

  if (!result) {
    return res.status(400).json({ code: "InvalidSignature", message: "Invalid sig" });
  }

  next();
};

export const checkAndAddPhoneNumber = async (req: Request, res: Response, next: NextFunction) => {
  const { address } = req.body;

  const result = await knexRead(ADDRESS_NUMBER_DATA).where({ address }).first();
  if (!result) {
    return res.status(400).json({ code: "InvalidAddress", message: "Address not found" });
  }
  req.params.phoneNumber = result.number;
  req.params.status = result.status;
  next();
};

export const checkAndAddSecretkey = async (req: Request, res: Response, next: NextFunction) => {
  const { address } = req.body;

  const result = await knexRead(ADDRESS_AUTHENTICATOR_DATA).where({ address, deleted: "false" }).first();
  if (!result) {
    return res.status(400).json({ code: "InvalidAddress", message: "Address not found" });
  }
  req.params.secretKey = result.secretKey;
  req.params.status = result.status;
  next();
};
