import { ec as EC } from "elliptic";

export const getEcCrypto = () => {
  return new EC("secp256k1");
};
