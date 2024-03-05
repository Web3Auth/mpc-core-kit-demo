import { post } from "@toruslabs/http-helpers";
import BN from "bn.js";
import type { ec } from "elliptic";
import { keccak256 } from "ethereum-cryptography/keccak";

import { getEcCrypto } from "./utils";

class AuthenticatorService {
  readonly authenticatorUrl: string = `${process.env.REACT_APP_BACKEND_ENDPOINT}/api/v1`; // "http://localhost:3021/api/v1";

  constructor() {
    if (!process.env.REACT_APP_BACKEND_ENDPOINT) {
      throw new Error(
        "env REACT_APP_BACKEND_ENDPOINT is not defined. You likely don't have an .env file, use one of the example files or create one."
      );
    }
  }

  async register(privKey: BN): Promise<{ success: boolean; qrData: string; secret: string }> {
    const ec = getEcCrypto();
    const privKeyPair: ec.KeyPair = ec.keyFromPrivate(privKey.toString(16, 64));
    const pubKey = privKeyPair.getPublic();
    const address = {
      x: pubKey.getX().toString(16, 64),
      y: pubKey.getY().toString(16, 64),
    };
    const sig = ec.sign(keccak256(Buffer.from(`${address.x}${address.y}`, "utf8")), Buffer.from(privKey.toString(16, 64), "hex"));

    const data = {
      pubKey: address,
      sig: {
        r: sig.r.toString(16, 64),
        s: sig.s.toString(16, 64),
        v: new BN(sig.recoveryParam as number).toString(16, 2),
      },
    };

    const resp = await post<{
      success: boolean;
      qrData: string;
      secret: string;
    }>(`${this.authenticatorUrl}/authenticator/register`, data);

    return resp;
  }

  async addAuthenticatorRecovery(address: string, code: string, factorKey: BN) {
    if (!factorKey) throw new Error("factorKey is not defined");
    if (!address) throw new Error("address is not defined");
    if (!code) throw new Error("code is not defined");

    const data = {
      address,
      code,
      data: {
        // If the verification is complete, we save the factorKey for the user address.
        // This factorKey is used to verify the user in the future on a new device and recover tss share.
        factorKey: factorKey.toString(16, 64),
      },
    };

    await post(`${this.authenticatorUrl}/authenticator/verify`, data);
  }

  async verifyAuthenticatorRecovery(address: string, code: string): Promise<BN | undefined> {
    const verificationData = {
      address,
      code,
    };

    const response = await post<{ data?: Record<string, string> }>(`${this.authenticatorUrl}/authenticator/verify`, verificationData);
    const { data } = response;
    return data ? new BN(data.factorKey, "hex") : undefined;
  }
}

export default new AuthenticatorService();
