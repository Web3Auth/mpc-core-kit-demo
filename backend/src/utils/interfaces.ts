export interface Signature {
  r: string;
  s: string;
  v: string;
}

export interface PointHex {
  x: string;
  y: string;
}

export interface IRegisterRequestBody {
  pubKey: PointHex;
  sig: Signature;
  number: string;
}

export interface IAuthenticatorRegisterRequestBody {
  pubKey: PointHex;
  sig: Signature;
  secretKey: string;
}

export interface IInitiatePasswordlessBody {
  address: string;
}

export interface IVerifyPasswordlessBody extends IInitiatePasswordlessBody {
  code: string;
  data?: Record<string, unknown>;
}

export interface SMSInitiateParams {
  number: string;
}

export interface SMSVerifyParams extends SMSInitiateParams {
  code: string;
}
